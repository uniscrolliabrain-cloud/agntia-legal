import { describe, expect, it } from 'vitest';
import { authorize, assertMandate, twinBindingSchema, type ResourceRef } from '../../src/core/policy.js';
import { LegalError } from '../../src/domain/errors.js';
import { eur, makePrincipal, TENANT_A, TENANT_B } from '../helpers/fixtures.js';

function capture(fn: () => void): LegalError {
  try {
    fn();
  } catch (error) {
    if (error instanceof LegalError) return error;
    throw error;
  }
  throw new Error('expected a LegalError');
}

const matter: ResourceRef = {
  id: 'mat_1',
  tenantId: TENANT_A,
  kind: 'matter',
  restricted: false,
  allowSubs: [],
  allowRoles: [],
};

describe('authorization', () => {
  it('allows a granted capability within the principal tenant', () => {
    expect(() =>
      authorize(makePrincipal(), {
        capability: 'legal.matter.read',
        tenantId: TENANT_A,
        resource: matter,
      }),
    ).not.toThrow();
  });

  it('denies a capability that no role grants', () => {
    const error = capture(() =>
      authorize(makePrincipal(), { capability: 'legal.everything' as never, tenantId: TENANT_A }),
    );
    expect(error.code).toBe('FORBIDDEN');
    expect(error.details.reason).toBe('CAPABILITY_NOT_GRANTED');
  });

  it('denies a capability the role does not hold', () => {
    const specialist = makePrincipal({ roles: ['specialist'] });
    const error = capture(() =>
      authorize(specialist, { capability: 'legal.intent.execute', tenantId: TENANT_A }),
    );
    expect(error.details.reason).toBe('CAPABILITY_NOT_GRANTED');
  });

  it('denies a suspended membership', () => {
    const suspended = makePrincipal({ status: 'suspended' });
    const error = capture(() =>
      authorize(suspended, { capability: 'legal.matter.read', tenantId: TENANT_A }),
    );
    expect(error.details.reason).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('hides a resource of another tenant as not found', () => {
    const error = capture(() =>
      authorize(makePrincipal(), {
        capability: 'legal.matter.read',
        tenantId: TENANT_A,
        resource: { ...matter, tenantId: TENANT_B },
      }),
    );
    expect(error.code).toBe('NOT_FOUND');
    expect(error.details.reason).toBe('RESOURCE_NOT_FOUND');
  });

  it('denies a restricted resource without an ACL match', () => {
    const collaborator = makePrincipal({ roles: ['collaborator'] });
    const error = capture(() =>
      authorize(collaborator, {
        capability: 'legal.matter.read',
        tenantId: TENANT_A,
        resource: {
          ...matter,
          restricted: true,
          allowSubs: ['someone-else'],
          allowRoles: ['specialist'],
        },
      }),
    );
    expect(error.code).toBe('NOT_FOUND');
  });

  it('allows a restricted resource when the role matches', () => {
    const specialist = makePrincipal({ roles: ['specialist'] });
    expect(() =>
      authorize(specialist, {
        capability: 'legal.matter.read',
        tenantId: TENANT_A,
        resource: { ...matter, restricted: true, allowRoles: ['specialist'] },
      }),
    ).not.toThrow();
  });
});

const mandate = twinBindingSchema.parse({
  id: 'tw_1',
  canonicalAgentRef: { runtimeId: 'rt_1' },
  canonicalRevision: '54b8d54',
  localInstanceId: 'li_1',
  targetTenantId: TENANT_A,
  workOrderId: 'wo_1',
  capabilities: ['legal.filing.propose'],
  purpose: 'present-draft',
  budget: { ceiling: eur('10.00'), spent: eur('2.00') },
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-02-01T00:00:00.000Z',
  revocationVersion: 0,
  proofRef: 'proof_1',
  status: 'active',
});

const mandateRequest = {
  capability: 'legal.filing.propose' as const,
  targetTenantId: TENANT_A,
  purpose: 'present-draft',
  now: new Date('2026-01-15T00:00:00.000Z'),
  revocationVersion: 0,
};

describe('delegation mandate', () => {
  it('accepts a valid, scoped mandate', () => {
    expect(() => assertMandate(mandate, mandateRequest)).not.toThrow();
  });

  it('rejects an expired mandate', () => {
    const error = capture(() =>
      assertMandate(mandate, { ...mandateRequest, now: new Date('2026-02-02T00:00:00.000Z') }),
    );
    expect(error.details.reasons).toContain('MANDATE_EXPIRED');
  });

  it('rejects a capability that was not delegated', () => {
    const error = capture(() =>
      assertMandate(mandate, { ...mandateRequest, capability: 'legal.retention.preview' }),
    );
    expect(error.details.reasons).toContain('CAPABILITY_NOT_DELEGATED');
  });

  it('rejects a different purpose or target tenant', () => {
    const error = capture(() =>
      assertMandate(mandate, {
        ...mandateRequest,
        purpose: 'something-else',
        targetTenantId: TENANT_B,
      }),
    );
    expect(error.details.reasons).toContain('PURPOSE_MISMATCH');
    expect(error.details.reasons).toContain('TARGET_TENANT_MISMATCH');
  });

  it('rejects a revoked mandate version', () => {
    const error = capture(() =>
      assertMandate(mandate, { ...mandateRequest, revocationVersion: 2 }),
    );
    expect(error.details.reasons).toContain('MANDATE_REVOKED');
  });

  it('rejects an exhausted budget', () => {
    const exhausted = { ...mandate, budget: { ceiling: eur('10.00'), spent: eur('10.00') } };
    const error = capture(() => assertMandate(exhausted, mandateRequest));
    expect(error.details.reasons).toContain('BUDGET_EXHAUSTED');
  });
});
