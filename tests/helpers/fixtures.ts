import { createApproval, type ApprovalBinding, type CreateApprovalInput } from '../../src/domain/approval.js';
import { principalSchema, type MemberRole, type Principal } from '../../src/core/policy.js';
import { sha256Hex } from '../../src/core/hash.js';
import type { EvidenceRef } from '../../src/domain/evidence.js';

export const TENANT_A = 'tnt_alpha';
export const TENANT_B = 'tnt_beta';

export interface PrincipalOptions {
  userId?: string;
  tenantId?: string;
  roles?: MemberRole[];
  status?: 'active' | 'suspended' | 'revoked';
  kind?: 'human' | 'agent' | 'service';
}

export function makePrincipal(options: PrincipalOptions = {}): Principal {
  const userId = options.userId ?? 'user-1';
  return principalSchema.parse({
    actorId: `usr_${userId}`,
    userId,
    kind: options.kind ?? 'human',
    tenantId: options.tenantId ?? TENANT_A,
    memberships: [
      {
        tenantId: options.tenantId ?? TENANT_A,
        roles: options.roles ?? ['owner'],
        status: options.status ?? 'active',
      },
    ],
  });
}

export function evidence(
  tenantId: string,
  id = 'evd_1',
  overrides: Partial<EvidenceRef> = {},
): EvidenceRef {
  return {
    id,
    tenantId,
    resourceScope: 'matter:mat_1',
    originalCustodian: 'custodian_1',
    sourceObjectRef: `src:${id}`,
    sourceHash: sha256Hex(id),
    mapperVersion: 'mapper-v1',
    observedAt: '2026-01-10T00:00:00.000Z',
    kind: 'fact',
    reviewRef: 'rev_1',
    ...overrides,
  };
}

export function eur(amount: string) {
  return { amount, currency: 'EUR', exponent: 2 };
}

export const PAYLOAD_HASH = sha256Hex('approved-payload');
export const RIGHTS_HASH = sha256Hex('rights-v1');
export const POLICY_HASH = sha256Hex('policy-v1');

export function approvalFor(overrides: Partial<CreateApprovalInput> = {}): ApprovalBinding {
  return createApproval({
    tenantId: TENANT_A,
    resourceId: 'fil_1',
    resourceVersion: 3,
    principalId: 'usr_user-1',
    principalRole: 'owner',
    proofRef: 'proof_1',
    payloadHash: PAYLOAD_HASH,
    rightsHash: RIGHTS_HASH,
    policyHash: POLICY_HASH,
    recipient: 'registro@example.test',
    channel: 'filing-gateway',
    scope: 'present-draft',
    costCeiling: eur('10.00'),
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    revocationVersion: 0,
    ...overrides,
  });
}
