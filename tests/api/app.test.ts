import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { hashJson } from '../../src/core/hash.js';
import { LegalError } from '../../src/domain/errors.js';
import { approvalFor, makePrincipal, POLICY_HASH, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-01-15T00:00:00.000Z');

const principalA = makePrincipal({ userId: 'a', roles: ['owner'] });
const principalB = makePrincipal({ userId: 'b', tenantId: TENANT_B, roles: ['owner'] });

const runtime = createRuntime({
  resolvePrincipal: async (token: string) => {
    if (token === 'token-a') return principalA;
    if (token === 'token-b') return principalB;
    throw new LegalError('UNAUTHENTICATED', 'Invalid token');
  },
  now: () => NOW,
});

const auth = (token = 'token-a') => ({ authorization: `Bearer ${token}` });

async function post(path: string, body: unknown, token = 'token-a'): Promise<Response> {
  return runtime.app.request(path, {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createMatter(token = 'token-a'): Promise<Record<string, unknown>> {
  const response = await post(
    '/v1/legal/matters',
    {
      title: 'Revision contractual',
      purpose: 'review',
      territory: 'ES',
      applicableDate: '2026-11-01',
      requestedAction: 'prepare-draft',
      scopeComplete: true,
    },
    token,
  );
  expect(response.status).toBe(201);
  return (await response.json()) as Record<string, unknown>;
}

describe('API surface', () => {
  it('exposes an unauthenticated health probe', async () => {
    const response = await runtime.app.request('/health');
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.service).toBe('agntia-legal');
    expect(body.provider).toBe('not_configured');
  });

  it('rejects unauthenticated access', async () => {
    const response = await runtime.app.request('/v1/legal/me');
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('resolves the principal server-side', async () => {
    const response = await runtime.app.request('/v1/legal/me', { headers: auth() });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { tenantId: string; capabilities: string[] };
    expect(body.tenantId).toBe(principalA.tenantId);
    expect(body.capabilities).toContain('legal.matter.read');
  });

  it('creates a matter in intake when the scope is incomplete', async () => {
    const response = await post('/v1/legal/matters', {
      title: 'Consulta',
      purpose: 'advise',
      territory: 'ES',
      applicableDate: '2026-11-01',
      requestedAction: 'research',
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { state: string; tenantId: string };
    expect(body.state).toBe('intake');
    expect(body.tenantId).toBe(principalA.tenantId);
  });

  it('hides another tenant matter as not found', async () => {
    const matter = await createMatter('token-a');
    const response = await runtime.app.request(`/v1/legal/matters/${String(matter.id)}`, {
      headers: auth('token-b'),
    });
    expect(response.status).toBe(404);
  });

  it('rejects an illegal transition with reasons', async () => {
    const matter = await createMatter();
    const response = await post(`/v1/legal/matters/${String(matter.id)}/transitions`, {
      to: 'delivered',
      expectedVersion: 1,
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { details: { reasons: string[] } } };
    expect(body.error.details.reasons).toContain('ILLEGAL_TRANSITION:scope_pending->delivered');
  });

  it('applies optimistic concurrency on transitions', async () => {
    const matter = await createMatter();
    const first = await post(`/v1/legal/matters/${String(matter.id)}/transitions`, {
      to: 'conflict_review',
      expectedVersion: 1,
    });
    expect(first.status).toBe(200);

    const second = await post(`/v1/legal/matters/${String(matter.id)}/transitions`, {
      to: 'fact_gathering',
      expectedVersion: 1,
    });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { details: { reason: string } } };
    expect(body.error.details.reason).toBe('VERSION_CONFLICT');
  });

  it('answers a citation it cannot resolve without inventing an authority', async () => {
    const response = await post('/v1/legal/citations/verify', {
      citation: 'Ley 99/2099',
      jurisdiction: 'ES',
      applicableDate: '2026-01-01',
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; existence: boolean };
    expect(body.status).toBe('not_found');
    expect(body.existence).toBe(false);
  });

  it('disables sensitive effects when no provider is configured', async () => {
    const payload = { draftHash: 'abc' };
    const approval = approvalFor({
      resourceId: 'fil_1',
      resourceVersion: 1,
      payloadHash: hashJson(payload),
    });
    runtime.approvalStore.save(approval);
    const response = await post('/v1/legal/intents', {
      capability: 'legal.filing.propose',
      idempotencyKey: 'idem-api-1',
      payload,
      approvalRef: approval.id,
      operation: {
        resourceId: 'fil_1',
        resourceVersion: 1,
        recipient: 'registro@example.test',
        channel: 'filing-gateway',
        scope: 'present-draft',
        policyHash: POLICY_HASH,
      },
      purpose: 'present-draft',
      revocationVersion: 0,
    });
    expect(response.status).toBe(424);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('CAPABILITY_NOT_VERIFIED');
  });

  it('returns a dry-run preview without any effect', async () => {
    const response = await post('/v1/legal/intents', {
      capability: 'legal.filing.propose',
      idempotencyKey: 'idem-api-dry',
      payload: { draftHash: 'abc' },
      approvalRef: null,
      operation: {
        resourceId: 'fil_1',
        resourceVersion: 1,
        recipient: 'registro@example.test',
        channel: 'filing-gateway',
        scope: 'present-draft',
        policyHash: 'a'.repeat(64),
      },
      purpose: 'present-draft',
      revocationVersion: 0,
      dryRun: true,
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { intent: { status: string } };
    expect(body.intent.status).toBe('proposed');
  });

  it('keeps the audit log inside the tenant', async () => {
    await createMatter('token-a');
    expect(runtime.audit.list(principalA.tenantId).length).toBeGreaterThan(0);
    expect(runtime.audit.list(TENANT_B)).toHaveLength(0);
  });

  it('rejects secret-bearing payloads', async () => {
    const response = await post('/v1/legal/intents', {
      capability: 'legal.filing.propose',
      idempotencyKey: 'idem-secret',
      payload: { api_key: 'sk-live-123' },
      approvalRef: null,
      operation: {
        resourceId: 'fil_1',
        resourceVersion: 1,
        recipient: 'registro@example.test',
        channel: 'filing-gateway',
        scope: 'present-draft',
        policyHash: 'a'.repeat(64),
      },
      purpose: 'present-draft',
      revocationVersion: 0,
      dryRun: true,
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_INPUT');
  });
});
