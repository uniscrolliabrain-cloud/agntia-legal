import { z } from 'zod';
import { LegalError } from './errors.js';
import { opaqueIdSchema } from './ids.js';

/** Named capability, e.g. `legal.citation.verify`. There is no wildcard form. */
export const capabilitySchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/, 'named capability required');

export type Capability = z.infer<typeof capabilitySchema>;

/**
 * Proposed v1 envelope (docs/contracts/01-contratos.md). Fields are strict:
 * unknown keys are rejected instead of silently accepted.
 */
export const envelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    actorId: opaqueIdSchema,
    capability: capabilitySchema,
    requestId: opaqueIdSchema.optional(),
    correlationId: opaqueIdSchema,
    causationId: opaqueIdSchema.nullable().default(null),
    idempotencyKey: opaqueIdSchema,
    expectedVersion: z.number().int().min(0),
    approvalRef: opaqueIdSchema.nullable().default(null),
    dryRun: z.boolean().default(true),
    payload: z.record(z.unknown()),
  })
  .strict();

export type Envelope = z.infer<typeof envelopeSchema>;

export interface ResolvedPrincipalRef {
  readonly actorId: string;
  readonly tenantId: string;
}

/**
 * Identity/capability inside the JSON are never proof. The envelope may only
 * carry the values the server already resolved from the verified principal;
 * any divergence is a hard failure rather than an implicit delegation.
 */
export function parseEnvelope(input: unknown, principal: ResolvedPrincipalRef): Envelope {
  const parsed = envelopeSchema.safeParse(input);
  if (!parsed.success) {
    throw new LegalError('INVALID_INPUT', 'Invalid operation envelope', {
      details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
    });
  }
  const envelope = parsed.data;
  if (envelope.tenantId !== principal.tenantId) {
    throw new LegalError('FORBIDDEN', 'Envelope tenant does not match the verified principal', {
      details: { reason: 'TENANT_MISMATCH' },
    });
  }
  if (envelope.actorId !== principal.actorId) {
    throw new LegalError('FORBIDDEN', 'Envelope actor does not match the verified principal', {
      details: { reason: 'ACTOR_MISMATCH' },
    });
  }
  assertNoSecretMaterial(envelope.payload);
  return envelope;
}

const SECRET_KEY = /(secret|token|password|passwd|credential|api[_-]?key|private[_-]?key|authorization)/i;

function collectSecretKeys(value: unknown, path: string, found: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSecretKeys(entry, `${path}[${index}]`, found));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (SECRET_KEY.test(key)) found.push(nextPath);
      collectSecretKeys(entry, nextPath, found);
    }
  }
}

/**
 * Domain payloads carry references, never credentials. To avoid leaking a
 * secret into audit/outbox/LLM context, secret-looking keys are rejected.
 */
export function assertNoSecretMaterial(payload: unknown): void {
  const found: string[] = [];
  collectSecretKeys(payload, '', found);
  if (found.length > 0) {
    throw new LegalError('INVALID_INPUT', 'Payload must not contain secret material', {
      details: { secretPaths: found },
    });
  }
}
