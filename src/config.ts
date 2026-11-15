import { z } from 'zod';
import { MEMBER_ROLES, membershipSchema, type Membership } from './core/policy.js';
import { LegalError } from './domain/errors.js';
import { parseStrict } from './domain/validate.js';
import type { MembershipProvisioning } from './api/auth.js';

export const membershipEntrySchema = z
  .object({
    userId: z.string().min(1).max(128),
    tenantId: z.string().min(1).max(128),
    roles: z.array(z.enum(MEMBER_ROLES)).min(1),
    status: z.enum(['active', 'suspended', 'revoked']),
  })
  .strict();

export type MembershipEntry = z.infer<typeof membershipEntrySchema>;

/**
 * Provisioning backed by explicit server configuration. In a real deployment
 * this is replaced by a query to the provisioned memberships table; it is
 * never derived from editable `user_metadata` or from the model.
 */
export class StaticMembershipProvisioning implements MembershipProvisioning {
  private readonly byUser = new Map<string, Membership[]>();

  constructor(entries: readonly MembershipEntry[]) {
    for (const entry of entries) {
      const parsed = parseStrict(membershipEntrySchema, entry, 'membership entry');
      const list = this.byUser.get(parsed.userId) ?? [];
      list.push(
        membershipSchema.parse({
          tenantId: parsed.tenantId,
          roles: parsed.roles,
          status: parsed.status,
        }),
      );
      this.byUser.set(parsed.userId, list);
    }
  }

  async getMemberships(userId: string): Promise<Membership[]> {
    return (this.byUser.get(userId) ?? []).map((membership) => ({ ...membership }));
  }
}

export function parseMembershipEntries(raw: string | undefined): MembershipEntry[] {
  if (!raw || raw.trim().length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LegalError('INVALID_INPUT', 'LEGAL_MEMBERSHIPS must be valid JSON');
  }
  return parseStrict(z.array(membershipEntrySchema), parsed, 'membership configuration');
}

export interface ServerConfig {
  port: number;
  jwksUrl: string | null;
  issuer: string | null;
  audience: string | null;
  memberships: MembershipEntry[];
}

export function loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new LegalError('INVALID_INPUT', 'Invalid PORT');
  }
  return {
    port,
    jwksUrl: env.LEGAL_JWKS_URL ?? null,
    issuer: env.LEGAL_ISSUER ?? null,
    audience: env.LEGAL_AUDIENCE ?? null,
    memberships: parseMembershipEntries(env.LEGAL_MEMBERSHIPS),
  };
}
