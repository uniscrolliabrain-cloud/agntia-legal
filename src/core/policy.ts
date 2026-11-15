import { z } from 'zod';
import { LegalError } from '../domain/errors.js';
import { capabilitySchema, type Capability } from '../domain/envelope.js';
import { isoDateTimeSchema, moneySchema, opaqueIdSchema } from '../domain/ids.js';
import { compareMoney } from '../domain/approval.js';

export const MEMBER_ROLES = [
  'owner',
  'specialist',
  'reviewer',
  'collaborator',
  'operator',
  'service',
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * Capabilities each role may invoke. Anything absent is denied: there is no
 * wildcard, no default owner fallback and no admin escape hatch.
 */
const ROLE_CAPABILITIES: Record<MemberRole, readonly Capability[]> = {
  owner: [
    'legal.matter.read',
    'legal.matter.transition',
    'legal.intake.propose',
    'legal.conflicts.preview',
    'legal.access.validate',
    'legal.document.stage',
    'legal.extract.preview',
    'legal.facts.propose',
    'legal.citation.resolve',
    'legal.citation.verify',
    'legal.memo.propose',
    'legal.draft.propose',
    'legal.playbook.preview',
    'legal.redline.preview',
    'legal.obligation.propose',
    'legal.deadline.propose',
    'legal.change.preview',
    'legal.interview.preview',
    'legal.review.record',
    'legal.filing.propose',
    'legal.retention.preview',
    'legal.report.read',
    'legal.intent.execute',
  ],
  specialist: [
    'legal.matter.read',
    'legal.matter.transition',
    'legal.intake.propose',
    'legal.conflicts.preview',
    'legal.document.stage',
    'legal.extract.preview',
    'legal.facts.propose',
    'legal.citation.resolve',
    'legal.citation.verify',
    'legal.memo.propose',
    'legal.draft.propose',
    'legal.playbook.preview',
    'legal.redline.preview',
    'legal.obligation.propose',
    'legal.deadline.propose',
    'legal.change.preview',
    'legal.interview.preview',
    'legal.report.read',
  ],
  reviewer: [
    'legal.matter.read',
    'legal.citation.resolve',
    'legal.citation.verify',
    'legal.memo.propose',
    'legal.deadline.propose',
    'legal.review.record',
    'legal.report.read',
  ],
  collaborator: ['legal.matter.read', 'legal.facts.propose', 'legal.document.stage'],
  operator: ['legal.matter.read', 'legal.access.validate', 'legal.report.read'],
  service: [],
};

export const membershipSchema = z
  .object({
    tenantId: opaqueIdSchema,
    roles: z.array(z.enum(MEMBER_ROLES)).min(1),
    status: z.enum(['active', 'suspended', 'revoked']),
  })
  .strict();

export type Membership = z.infer<typeof membershipSchema>;

export const principalSchema = z
  .object({
    actorId: opaqueIdSchema,
    userId: opaqueIdSchema,
    kind: z.enum(['human', 'agent', 'service']),
    tenantId: opaqueIdSchema,
    memberships: z.array(membershipSchema).min(1),
    runtimeId: opaqueIdSchema.optional(),
    personaId: opaqueIdSchema.optional(),
    roleId: opaqueIdSchema.optional(),
  })
  .strict();

export type Principal = z.infer<typeof principalSchema>;

/** Resource projection used by the policy decision point. */
export const resourceRefSchema = z
  .object({
    id: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    kind: z.string().min(1).max(64),
    restricted: z.boolean().default(false),
    allowSubs: z.array(opaqueIdSchema).default([]),
    allowRoles: z.array(z.enum(MEMBER_ROLES)).default([]),
  })
  .strict();

export type ResourceRef = z.infer<typeof resourceRefSchema>;

export interface AuthorizeRequest {
  capability: Capability;
  tenantId: string;
  resource?: ResourceRef;
}

function activeMembership(principal: Principal, tenantId: string): Membership | undefined {
  return principal.memberships.find(
    (membership) => membership.tenantId === tenantId && membership.status === 'active',
  );
}

/**
 * Deny-by-default PDP. The tenant comes from the verified principal; a
 * resource of another tenant, a restricted resource without a matching ACL or
 * a capability the role does not hold are all hard failures.
 */
export function authorize(principal: Principal, request: AuthorizeRequest): void {
  const parsedCapability = capabilitySchema.safeParse(request.capability);
  if (!parsedCapability.success) {
    throw new LegalError('FORBIDDEN', 'Unknown capability', {
      details: { reason: 'UNKNOWN_CAPABILITY', capability: request.capability },
    });
  }

  if (request.tenantId !== principal.tenantId) {
    throw new LegalError('FORBIDDEN', 'Cross-tenant access denied', {
      details: { reason: 'TENANT_SCOPE_MISMATCH' },
    });
  }

  const membership = activeMembership(principal, principal.tenantId);
  if (!membership) {
    throw new LegalError('FORBIDDEN', 'No active membership for the selected tenant', {
      details: { reason: 'MEMBERSHIP_NOT_ACTIVE' },
    });
  }

  const granted = new Set<Capability>();
  for (const role of membership.roles) {
    for (const capability of ROLE_CAPABILITIES[role]) granted.add(capability);
  }
  if (!granted.has(request.capability)) {
    throw new LegalError('FORBIDDEN', 'Role does not grant this capability', {
      details: { reason: 'CAPABILITY_NOT_GRANTED', capability: request.capability },
    });
  }

  const resource = request.resource;
  if (resource) {
    if (resource.tenantId !== principal.tenantId) {
      // Same answer as a missing resource: existence of foreign IDs is not leaked.
      throw new LegalError('NOT_FOUND', 'Resource not found', {
        details: { reason: 'RESOURCE_NOT_FOUND' },
      });
    }
    if (resource.restricted) {
      const allowedBySub = resource.allowSubs.includes(principal.userId);
      const allowedByRole = membership.roles.some((role) => resource.allowRoles.includes(role));
      if (!allowedBySub && !allowedByRole) {
        throw new LegalError('NOT_FOUND', 'Resource not found', {
          details: { reason: 'RESOURCE_NOT_FOUND' },
        });
      }
    }
  }
}

export function capabilitiesForPrincipal(principal: Principal): Capability[] {
  const membership = activeMembership(principal, principal.tenantId);
  if (!membership) return [];
  const granted = new Set<Capability>();
  for (const role of membership.roles) {
    for (const capability of ROLE_CAPABILITIES[role]) granted.add(capability);
  }
  return [...granted].sort();
}

export const canonicalAgentRefSchema = z
  .object({
    runtimeId: opaqueIdSchema,
    personaId: opaqueIdSchema.optional(),
    roleId: opaqueIdSchema.optional(),
  })
  .strict();

/**
 * Local twin binding. The canonical agent lives in the parent repository; this
 * schema never creates a second sovereign identity and never carries memories.
 */
export const twinBindingSchema = z
  .object({
    id: opaqueIdSchema,
    canonicalAgentRef: canonicalAgentRefSchema,
    canonicalRevision: z.string().min(1).max(128),
    localInstanceId: opaqueIdSchema,
    targetTenantId: opaqueIdSchema,
    workOrderId: opaqueIdSchema,
    capabilities: z.array(capabilitySchema).min(1),
    purpose: z.string().min(1).max(512),
    budget: z
      .object({
        ceiling: moneySchema,
        spent: moneySchema,
      })
      .strict(),
    issuedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    revocationVersion: z.number().int().min(0),
    proofRef: opaqueIdSchema,
    status: z.enum(['active', 'revoked', 'expired']),
  })
  .strict();

export type TwinBinding = z.infer<typeof twinBindingSchema>;

export interface MandateRequest {
  capability: Capability;
  targetTenantId: string;
  purpose: string;
  now: Date;
  revocationVersion: number;
}

export function checkMandate(mandate: TwinBinding, request: MandateRequest): string[] {
  const reasons: string[] = [];
  if (mandate.status !== 'active') reasons.push('MANDATE_NOT_ACTIVE');
  if (mandate.revocationVersion !== request.revocationVersion) reasons.push('MANDATE_REVOKED');
  if (mandate.targetTenantId !== request.targetTenantId) reasons.push('TARGET_TENANT_MISMATCH');
  if (!mandate.capabilities.includes(request.capability)) reasons.push('CAPABILITY_NOT_DELEGATED');
  if (mandate.purpose !== request.purpose) reasons.push('PURPOSE_MISMATCH');
  if (request.now.getTime() < new Date(mandate.issuedAt).getTime()) reasons.push('MANDATE_NOT_YET_VALID');
  if (request.now.getTime() >= new Date(mandate.expiresAt).getTime()) reasons.push('MANDATE_EXPIRED');
  if (mandate.budget.ceiling.currency !== mandate.budget.spent.currency) {
    reasons.push('BUDGET_CURRENCY_MISMATCH');
  } else if (compareMoney(mandate.budget.spent, mandate.budget.ceiling) >= 0) {
    reasons.push('BUDGET_EXHAUSTED');
  }
  return reasons;
}

export function assertMandate(mandate: TwinBinding, request: MandateRequest): void {
  const reasons = checkMandate(mandate, request);
  if (reasons.length > 0) {
    throw new LegalError('FORBIDDEN', 'Delegation mandate does not allow this operation', {
      details: { reasons, mandateId: mandate.id },
    });
  }
}
