import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type KeyLike,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createJwtPrincipalResolver,
  extractBearer,
  type PrincipalResolver,
} from '../../src/api/auth.js';
import { StaticMembershipProvisioning } from '../../src/config.js';
import { LegalError } from '../../src/domain/errors.js';
import { TENANT_A, TENANT_B } from '../helpers/fixtures.js';

const ISSUER = 'https://project.supabase.test/auth/v1';
const AUDIENCE = 'authenticated';

type LocalKeySet = Parameters<typeof createLocalJWKSet>[0];

let privateKey: KeyLike;
let jwks: LocalKeySet;
let resolvePrincipal: PrincipalResolver;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwks = { keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] } as LocalKeySet;

  const provisioning = new StaticMembershipProvisioning([
    { userId: 'user-1', tenantId: TENANT_A, roles: ['owner'], status: 'active' },
    { userId: 'user-2', tenantId: TENANT_B, roles: ['specialist'], status: 'active' },
    { userId: 'user-3', tenantId: TENANT_A, roles: ['owner'], status: 'suspended' },
  ]);

  resolvePrincipal = createJwtPrincipalResolver({
    jwks,
    issuer: ISSUER,
    audience: AUDIENCE,
    provisioning,
  });
});

interface SignOptions {
  subject?: string;
  issuer?: string;
  audience?: string;
  expiresAt?: number;
  claims?: Record<string, unknown>;
}

async function sign(options: SignOptions = {}): Promise<string> {
  let builder = new SignJWT({ ...(options.claims ?? {}) })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? AUDIENCE)
    .setSubject(options.subject ?? 'user-1')
    .setIssuedAt();

  builder =
    options.expiresAt === undefined
      ? builder.setExpirationTime('5m')
      : builder.setExpirationTime(options.expiresAt);

  return builder.sign(privateKey);
}

async function failure(promise: Promise<unknown>): Promise<LegalError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof LegalError) return error;
    throw error;
  }
  throw new Error('expected a LegalError');
}

describe('JWT principal resolution', () => {
  it('accepts a valid token and resolves the provisioned tenant', async () => {
    const principal = await resolvePrincipal(await sign({ claims: { tenant_id: TENANT_A } }));
    expect(principal.tenantId).toBe(TENANT_A);
    expect(principal.actorId).toBe('usr_user-1');
    expect(principal.userId).toBe('user-1');
  });

  it('uses the only active membership when no tenant is claimed', async () => {
    const principal = await resolvePrincipal(await sign());
    expect(principal.tenantId).toBe(TENANT_A);
  });

  it('rejects an expired token', async () => {
    const token = await sign({ expiresAt: Math.floor(Date.now() / 1000) - 60 });
    const error = await failure(resolvePrincipal(token));
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token for another audience or issuer', async () => {
    expect((await failure(resolvePrincipal(await sign({ audience: 'otro' })))).code).toBe(
      'UNAUTHENTICATED',
    );
    expect((await failure(resolvePrincipal(await sign({ issuer: 'https://evil.test' })))).code).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('rejects a symmetric algorithm instead of sharing a secret', async () => {
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject('user-1')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('shared-secret'));
    expect((await failure(resolvePrincipal(forged))).code).toBe('UNAUTHENTICATED');
  });

  it('never falls back when the claimed tenant is not provisioned', async () => {
    const token = await sign({ subject: 'user-2', claims: { tenant_id: TENANT_A } });
    const error = await failure(resolvePrincipal(token));
    expect(error.code).toBe('FORBIDDEN');
    expect(error.details.reason).toBe('TENANT_NOT_PROVISIONED');
  });

  it('ignores editable user_metadata as a source of tenant authority', async () => {
    const token = await sign({
      claims: { user_metadata: { tenant_id: TENANT_B, role: 'owner' } },
    });
    const principal = await resolvePrincipal(token);
    expect(principal.tenantId).toBe(TENANT_A);
  });

  it('rejects a user without provisioned membership', async () => {
    const token = await sign({ subject: 'user-404' });
    const error = await failure(resolvePrincipal(token));
    expect(error.details.reason).toBe('MEMBERSHIP_NOT_PROVISIONED');
  });

  it('rejects a suspended membership', async () => {
    const token = await sign({ subject: 'user-3' });
    const error = await failure(resolvePrincipal(token));
    expect(error.details.reason).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('requires an explicit tenant when several memberships are active', async () => {
    const multi = new StaticMembershipProvisioning([
      { userId: 'user-9', tenantId: TENANT_A, roles: ['owner'], status: 'active' },
      { userId: 'user-9', tenantId: TENANT_B, roles: ['reviewer'], status: 'active' },
    ]);
    const resolver = createJwtPrincipalResolver({
      jwks,
      issuer: ISSUER,
      audience: AUDIENCE,
      provisioning: multi,
    });
    const error = await failure(resolver(await sign({ subject: 'user-9' })));
    expect(error.details.reason).toBe('TENANT_SELECTION_REQUIRED');
  });
});

describe('bearer extraction', () => {
  it('extracts a bearer token', () => {
    expect(extractBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('rejects missing or malformed headers', () => {
    expect(() => extractBearer(undefined)).toThrow(LegalError);
    expect(() => extractBearer('Basic abc')).toThrow(LegalError);
    expect(() => extractBearer('Bearer')).toThrow(LegalError);
  });
});
