import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

type LocalKeySet = Parameters<typeof createLocalJWKSet>[0];
import { z } from 'zod';
import { membershipSchema, principalSchema, type Membership, type Principal } from '../core/policy.js';
import { LegalError } from '../domain/errors.js';
import { parseStrict } from '../domain/validate.js';

export interface MembershipProvisioning {
  getMemberships(userId: string): Promise<Membership[]>;
}

export interface JwtPrincipalResolverOptions {
  /** JWKS URL (production) or a local key set (tests). */
  jwks: LocalKeySet | string;
  issuer: string;
  audience: string;
  provisioning: MembershipProvisioning;
  clockToleranceSeconds?: number;
}

export interface PrincipalResolver {
  (token: string): Promise<Principal>;
}

/** Only asymmetric algorithms are accepted; no `none`, no HMAC sharing. */
const ALLOWED_ALGORITHMS = ['RS256', 'ES256'] as const;

const claimsSchema = z
  .object({
    sub: z.string().min(1),
    exp: z.number(),
    iat: z.number().optional(),
    tenant_id: z.string().min(1).optional(),
    app_metadata: z
      .object({ tenant_id: z.string().min(1).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

function keyResolver(jwks: LocalKeySet | string): JWTVerifyGetKey {
  return typeof jwks === 'string' ? createRemoteJWKSet(new URL(jwks)) : createLocalJWKSet(jwks);
}

export function extractBearer(header: string | undefined): string {
  if (!header) {
    throw new LegalError('UNAUTHENTICATED', 'Missing Authorization header');
  }
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    throw new LegalError('UNAUTHENTICATED', 'Malformed Authorization header');
  }
  return token;
}

/**
 * Verifies a Supabase JWT and builds a server-resolved principal.
 *
 * Notes that matter for security:
 * - signature, issuer, audience, exp/nbf and algorithm are verified;
 * - memberships come from server provisioning, never from `user_metadata`;
 * - the selected tenant must be an active membership, with no default fallback.
 */
export function createJwtPrincipalResolver(
  options: JwtPrincipalResolverOptions,
): PrincipalResolver {
  const keys = keyResolver(options.jwks);
  return async (token: string): Promise<Principal> => {
    let payload: unknown;
    try {
      const verified = await jwtVerify(token, keys, {
        issuer: options.issuer,
        audience: options.audience,
        algorithms: [...ALLOWED_ALGORITHMS],
        requiredClaims: ['sub', 'exp'],
        clockTolerance: options.clockToleranceSeconds ?? 5,
      });
      payload = verified.payload;
    } catch (error) {
      throw new LegalError('UNAUTHENTICATED', 'Invalid or expired token', {
        details: { reason: 'TOKEN_VERIFICATION_FAILED' },
        cause: error,
      });
    }

    const claims = parseStrict(claimsSchema, payload, 'token claims');
    const memberships = await options.provisioning.getMemberships(claims.sub);
    if (memberships.length === 0) {
      throw new LegalError('FORBIDDEN', 'No provisioned membership for this user', {
        details: { reason: 'MEMBERSHIP_NOT_PROVISIONED' },
      });
    }

    const active = memberships.filter((membership) => membership.status === 'active');
    if (active.length === 0) {
      throw new LegalError('FORBIDDEN', 'Membership is not active', {
        details: { reason: 'MEMBERSHIP_NOT_ACTIVE' },
      });
    }

    const claimedTenant = claims.tenant_id ?? claims.app_metadata?.tenant_id;
    let tenantId: string;
    if (claimedTenant) {
      const match = active.find((membership) => membership.tenantId === claimedTenant);
      if (!match) {
        // No fallback: a stale or hostile tenant claim must fail closed.
        throw new LegalError('FORBIDDEN', 'Token tenant is not an active membership', {
          details: { reason: 'TENANT_NOT_PROVISIONED' },
        });
      }
      tenantId = match.tenantId;
    } else if (active.length === 1) {
      const only = active[0];
      if (!only) {
        throw new LegalError('FORBIDDEN', 'No active membership', {
          details: { reason: 'MEMBERSHIP_NOT_ACTIVE' },
        });
      }
      tenantId = only.tenantId;
    } else {
      throw new LegalError('FORBIDDEN', 'Explicit tenant selection required', {
        details: { reason: 'TENANT_SELECTION_REQUIRED' },
      });
    }

    return parseStrict(
      principalSchema,
      {
        actorId: `usr_${claims.sub}`,
        userId: claims.sub,
        kind: 'human',
        tenantId,
        memberships: memberships.map((membership) =>
          membershipSchema.parse({
            tenantId: membership.tenantId,
            roles: membership.roles,
            status: membership.status,
          }),
        ),
      },
      'principal',
    );
  };
}

/** Used when the deployment has no auth configuration: nothing is accepted. */
export const unconfiguredResolver: PrincipalResolver = async () => {
  throw new LegalError('UNAUTHENTICATED', 'Authentication is not configured for this deployment', {
    details: { reason: 'AUTH_NOT_CONFIGURED' },
  });
};
