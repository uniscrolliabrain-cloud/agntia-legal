import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const TENANT_A = 'tnt_alpha';
const TENANT_B = 'tnt_beta';
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

const HASH = 'a'.repeat(64);

let db: PGlite;

async function asTenant(
  tenantId: string | null,
  userId: string | null,
  run: () => Promise<void>,
): Promise<void> {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claims', $1, false), set_config('request.jwt.uid', $2, false)",
    [tenantId === null ? '' : JSON.stringify({ tenant_id: tenantId }), userId ?? ''],
  );
  await db.exec('set role app_user');
  try {
    await run();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();

  // Supabase provides the auth schema and auth.uid(); emulate them for the test.
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.uid', true), '')::uuid $$;
    create role authenticated;
    create role app_user;
    grant authenticated to app_user;
  `);

  await db.exec(readFileSync('db/migrations/0001_init.sql', 'utf8'));
  await db.exec(readFileSync('db/migrations/0002_rls.sql', 'utf8'));

  await db.exec(`
    insert into legal.tenants (id, display_name) values
      ('${TENANT_A}', 'Alpha'),
      ('${TENANT_B}', 'Beta');

    insert into legal.memberships (tenant_id, user_id, roles, status) values
      ('${TENANT_A}', '${USER_A}', '{owner}', 'active'),
      ('${TENANT_B}', '${USER_B}', '{owner}', 'active');

    insert into legal.matters (
      tenant_id, id, version, requesting_actor_id, title, purpose, territory,
      applicable_date, requested_action, state
    ) values
      ('${TENANT_A}', 'mat_a', 1, 'usr_a', 'Matter A', 'review', 'ES', '2026-01-10', 'draft', 'intake'),
      ('${TENANT_B}', 'mat_b', 1, 'usr_b', 'Matter B', 'review', 'ES', '2026-01-10', 'draft', 'intake');

    insert into legal.intents (
      tenant_id, id, actor_id, capability, idempotency_key, payload_hash, status
    ) values
      ('${TENANT_A}', 'int_a', 'usr_a', 'legal.filing.propose', 'idem-a', '${HASH}', 'proposed'),
      ('${TENANT_B}', 'int_b', 'usr_b', 'legal.filing.propose', 'idem-b', '${HASH}', 'proposed');

    insert into legal.audit_events (tenant_id, id, actor_id, action, occurred_at, outcome)
    values ('${TENANT_A}', 'aud_a', 'usr_a', 'legal.matter.intake', now(), 'allowed');
  `);
});

describe('Postgres schema and RLS', () => {
  it('migrates cleanly and keeps both tenants', async () => {
    const tenants = await db.query<{ id: string }>('select id from legal.tenants order by id');
    expect(tenants.rows.map((row) => row.id)).toEqual([TENANT_A, TENANT_B]);
  });

  it('returns only rows of the claimed tenant with active membership', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      const matters = await db.query<{ id: string }>('select id from legal.matters');
      expect(matters.rows.map((row) => row.id)).toEqual(['mat_a']);

      const intents = await db.query<{ id: string }>('select id from legal.intents');
      expect(intents.rows.map((row) => row.id)).toEqual(['int_a']);

      const audits = await db.query<{ id: string }>('select id from legal.audit_events');
      expect(audits.rows.map((row) => row.id)).toEqual(['aud_a']);
    });
  });

  it('does not leak another tenant when the claim does not match the membership', async () => {
    await asTenant(TENANT_A, USER_B, async () => {
      const matters = await db.query('select id from legal.matters');
      expect(matters.rows).toHaveLength(0);
      const intents = await db.query('select id from legal.intents');
      expect(intents.rows).toHaveLength(0);
    });
  });

  it('rejects writes outside the claimed tenant', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      await expect(
        db.exec(`
          insert into legal.matters (
            tenant_id, id, version, requesting_actor_id, title, purpose, territory,
            applicable_date, requested_action, state
          ) values ('${TENANT_B}', 'mat_forged', 1, 'usr_a', 'Forged', 'x', 'ES', '2026-01-10', 'draft', 'intake')
        `),
      ).rejects.toThrow(/row-level security|violates/i);
    });
  });

  it('enforces append-only audit', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      await expect(
        db.exec("update legal.audit_events set action = 'tampered' where id = 'aud_a'"),
      ).rejects.toThrow(/append-only|42501|permission denied/i);
      await expect(db.exec("delete from legal.audit_events where id = 'aud_a'")).rejects.toThrow(
        /append-only|42501|permission denied/i,
      );
    });
  });

  it('enforces one intent per tenant, capability and idempotency key', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      await expect(
        db.exec(`
          insert into legal.intents (
            tenant_id, id, actor_id, capability, idempotency_key, payload_hash, status
          ) values ('${TENANT_A}', 'int_dup', 'usr_a', 'legal.filing.propose', 'idem-a', '${HASH}', 'proposed')
        `),
      ).rejects.toThrow(/duplicate key|unique/i);
    });
  });

  it('rejects a composite foreign key that mixes tenants', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      await expect(
        db.exec(`
          insert into legal.conflict_checks (
            tenant_id, id, matter_id, party_refs, representation, result
          ) values ('${TENANT_A}', 'cf_bad', 'mat_b', '[]', 'buyer', 'clear')
        `),
      ).rejects.toThrow(/foreign key|violates/i);
    });
  });

  it('accepts a well-formed conflict check for its own matter', async () => {
    await asTenant(TENANT_A, USER_A, async () => {
      await db.exec(`
        insert into legal.conflict_checks (
          tenant_id, id, matter_id, party_refs, representation, result
        ) values ('${TENANT_A}', 'cf_ok', 'mat_a', '["Proveedor SL"]', 'buyer', 'clear')
      `);
      const rows = await db.query<{ id: string }>("select id from legal.conflict_checks where id = 'cf_ok'");
      expect(rows.rows).toHaveLength(1);
    });
  });
});
