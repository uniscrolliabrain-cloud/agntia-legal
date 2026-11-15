import { describe, expect, it } from 'vitest';
import { LegalError } from '../../src/domain/errors.js';
import { parseEnvelope } from '../../src/domain/envelope.js';
import { makePrincipal, TENANT_A } from '../helpers/fixtures.js';

const principal = makePrincipal();

function baseEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    operationId: 'op_1',
    tenantId: TENANT_A,
    actorId: principal.actorId,
    capability: 'legal.draft.propose',
    correlationId: 'cor_1',
    idempotencyKey: 'idem_1',
    expectedVersion: 1,
    dryRun: true,
    payload: { resourceId: 'mat_1' },
    ...overrides,
  };
}

function capture(fn: () => unknown): LegalError {
  try {
    fn();
  } catch (error) {
    if (error instanceof LegalError) return error;
    throw error;
  }
  throw new Error('expected a LegalError');
}

describe('operation envelope', () => {
  it('accepts a well-formed envelope', () => {
    const parsed = parseEnvelope(baseEnvelope(), {
      actorId: principal.actorId,
      tenantId: principal.tenantId,
    });
    expect(parsed.capability).toBe('legal.draft.propose');
    expect(parsed.causationId).toBeNull();
    expect(parsed.approvalRef).toBeNull();
  });

  it('rejects unknown fields instead of silently accepting them', () => {
    const error = capture(() =>
      parseEnvelope(baseEnvelope({ adminOverride: true }), {
        actorId: principal.actorId,
        tenantId: principal.tenantId,
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
  });

  it('rejects a body tenant that differs from the verified principal', () => {
    const error = capture(() =>
      parseEnvelope(baseEnvelope({ tenantId: 'tnt_beta' }), {
        actorId: principal.actorId,
        tenantId: principal.tenantId,
      }),
    );
    expect(error.code).toBe('FORBIDDEN');
    expect(error.details.reason).toBe('TENANT_MISMATCH');
  });

  it('rejects a body actor that differs from the verified principal', () => {
    const error = capture(() =>
      parseEnvelope(baseEnvelope({ actorId: 'usr_someone-else' }), {
        actorId: principal.actorId,
        tenantId: principal.tenantId,
      }),
    );
    expect(error.details.reason).toBe('ACTOR_MISMATCH');
  });

  it('never accepts secret material in a domain payload', () => {
    const error = capture(() =>
      parseEnvelope(baseEnvelope({ payload: { connection: { api_key: 'sk-live' } } }), {
        actorId: principal.actorId,
        tenantId: principal.tenantId,
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.details.secretPaths).toEqual(['connection.api_key']);
  });

  it('requires a named capability', () => {
    const error = capture(() =>
      parseEnvelope(baseEnvelope({ capability: 'everything' }), {
        actorId: principal.actorId,
        tenantId: principal.tenantId,
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
  });
});
