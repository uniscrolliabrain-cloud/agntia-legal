import { z } from 'zod';
import { authorize, MEMBER_ROLES, type MemberRole, type Principal } from '../core/policy.js';
import { LegalError } from '../domain/errors.js';
import { isoDateTimeSchema, opaqueIdSchema } from '../domain/ids.js';
import { parseStrict } from '../domain/validate.js';

export const matterShareSchema = z
  .object({
    targetUserId: opaqueIdSchema,
    purpose: z.string().min(1).max(512),
    expiresAt: isoDateTimeSchema,
  })
  .strict();

export type MatterShare = z.infer<typeof matterShareSchema>;

export const matterAccessSchema = z
  .object({
    tenantId: opaqueIdSchema,
    matterId: opaqueIdSchema,
    restricted: z.boolean(),
    privilege: z.enum(['privileged', 'not_privileged', 'unknown']),
    basis: z.string().min(1).max(512).nullable(),
    allowSubs: z.array(opaqueIdSchema),
    allowRoles: z.array(z.enum(MEMBER_ROLES)),
    shares: z.array(matterShareSchema),
  })
  .strict();

export type MatterAccess = z.infer<typeof matterAccessSchema>;

export interface AssessPrivilegeInput {
  tenantId: string;
  matterId: string;
  privilege: 'privileged' | 'not_privileged' | 'unknown';
  basis?: string | null;
}

export interface ShareMatterInput {
  access: MatterAccess;
  principal: Principal;
  targetUserId: string;
  purpose: string;
  expiresAt: string;
  now: Date;
}

/**
 * Confidentiality rules:
 * - "not privileged" requires an explicit basis; otherwise the matter is
 *   restricted (fail closed);
 * - privileged matters are restricted to the owner and explicit shares;
 * - sharing requires the owner role, a purpose and an expiry.
 */
export class MatterAccessService {
  assess(input: AssessPrivilegeInput): { access: MatterAccess; reasons: string[] } {
    const reasons: string[] = [];
    let privilege = input.privilege;
    const basis = input.basis?.trim() ?? '';

    if (privilege === 'not_privileged' && basis.length === 0) {
      privilege = 'unknown';
      reasons.push('PRIVILEGE_BASIS_REQUIRED');
    }
    if (privilege === 'privileged' && basis.length === 0) {
      reasons.push('PRIVILEGE_BASIS_PENDING');
    }

    return {
      access: parseStrict(
        matterAccessSchema,
        {
          tenantId: input.tenantId,
          matterId: input.matterId,
          restricted: privilege !== 'not_privileged',
          privilege,
          basis: basis.length > 0 ? basis : null,
          allowSubs: [],
          allowRoles: privilege === 'not_privileged' ? [...MEMBER_ROLES] : ['owner'],
          shares: [],
        },
        'matter access',
      ),
      reasons,
    };
  }

  share(input: ShareMatterInput): MatterAccess {
    if (!this.hasRole(input.principal, 'owner')) {
      throw new LegalError('FORBIDDEN', 'Only the matter owner may share it', {
        details: { reason: 'OWNER_ROLE_REQUIRED' },
      });
    }
    if (input.access.tenantId !== input.principal.tenantId) {
      throw new LegalError('NOT_FOUND', 'Matter not found', {
        details: { reason: 'MATTER_NOT_FOUND' },
      });
    }
    if (input.expiresAt.length === 0 || new Date(input.expiresAt).getTime() <= input.now.getTime()) {
      throw new LegalError('INVALID_INPUT', 'Share must expire in the future', {
        details: { reason: 'SHARE_EXPIRY_REQUIRED' },
      });
    }

    const share = parseStrict(
      matterShareSchema,
      {
        targetUserId: input.targetUserId,
        purpose: input.purpose,
        expiresAt: input.expiresAt,
      },
      'share',
    );

    const existing = input.access.shares.filter(
      (candidate) => candidate.targetUserId !== share.targetUserId,
    );
    return matterAccessSchema.parse({
      ...input.access,
      shares: [...existing, share],
    });
  }

  /** Access check that combines the PDP with active shares. */
  authorizeRead(principal: Principal, access: MatterAccess, now: Date): void {
    const activeShare = access.shares.some(
      (share) =>
        share.targetUserId === principal.userId && new Date(share.expiresAt).getTime() > now.getTime(),
    );

    const allowSubs = [...new Set([...access.allowSubs, ...(activeShare ? [principal.userId] : [])])];

    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: {
        id: access.matterId,
        tenantId: access.tenantId,
        kind: 'matter',
        restricted: access.restricted,
        allowSubs,
        allowRoles: access.allowRoles,
      },
    });
  }

  hasRole(principal: Principal, role: MemberRole): boolean {
    return principal.memberships.some(
      (membership) =>
        membership.tenantId === principal.tenantId &&
        membership.status === 'active' &&
        membership.roles.includes(role),
    );
  }
}
