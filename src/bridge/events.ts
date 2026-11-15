import { z } from 'zod';
import { hashJson } from '../core/hash.js';
import { isoDateTimeSchema, opaqueIdSchema } from '../domain/ids.js';
import { parseStrict } from '../domain/validate.js';

export const LEGAL_EVENT_TYPES = [
  'legal.proposal.created',
  'legal.review.required',
  'legal.resource.changed',
  'legal.operation.confirmed',
  'legal.operation.outcome_unknown',
  'legal.connection.degraded',
] as const;

export type LegalEventType = (typeof LEGAL_EVENT_TYPES)[number];

export const legalEventSchema = z
  .object({
    id: opaqueIdSchema,
    type: z.enum(LEGAL_EVENT_TYPES),
    schemaVersion: z.literal(1),
    tenantId: opaqueIdSchema,
    actorRef: z
      .object({
        actorId: opaqueIdSchema,
        kind: z.enum(['human', 'agent', 'service']),
      })
      .strict(),
    occurredAt: isoDateTimeSchema,
    correlationId: opaqueIdSchema,
    causationId: opaqueIdSchema.nullable().default(null),
    resourceRef: opaqueIdSchema.nullable().default(null),
    payload: z.record(z.unknown()).default({}),
  })
  .strict();

export type LegalEvent = z.infer<typeof legalEventSchema>;

/**
 * Native parent event shape (schemaVersion is the string "1.0", owner and
 * source are required). These are host constraints, not ours to redefine.
 */
export const systemEventV1Schema = z
  .object({
    id: opaqueIdSchema,
    schemaVersion: z.literal('1.0'),
    type: z.string().min(3).max(128),
    tenantId: opaqueIdSchema,
    owner: z.string().min(1).max(256),
    emittedAt: isoDateTimeSchema,
    source: z
      .object({
        kind: z.string().min(1).max(64),
        id: opaqueIdSchema,
        personaId: opaqueIdSchema.optional(),
      })
      .strict(),
    correlationId: opaqueIdSchema.optional(),
    payload: z.record(z.unknown()).optional(),
  })
  .strict();

export type SystemEventV1 = z.infer<typeof systemEventV1Schema>;

export interface BridgeOptions {
  /** Types the host actually allows. Never assume or extend this list. */
  hostAllowlist: readonly string[];
  /** Explicit mapping legal event -> host type, confirmed against the host. */
  mapping: Partial<Record<LegalEventType, string>>;
  owner: string;
}

export interface BridgeResult {
  event: SystemEventV1 | null;
  hostMapping: 'MAPPED' | 'HOST_MAPPING_NOT_VERIFIED';
}

/**
 * Projects a confirmed local fact to the parent. Without a confirmed mapping
 * the event stays local (hostMapping NOT_VERIFIED); no enum value is invented
 * and no "success" or "activity done" is ever emitted.
 */
export function toSystemEvent(event: LegalEvent, options: BridgeOptions): BridgeResult {
  const parsed = parseStrict(legalEventSchema, event, 'legal event');
  const mappedType = options.mapping[parsed.type];
  if (!mappedType || !options.hostAllowlist.includes(mappedType)) {
    return { event: null, hostMapping: 'HOST_MAPPING_NOT_VERIFIED' };
  }
  const candidate = {
    id: parsed.id,
    schemaVersion: '1.0' as const,
    type: mappedType,
    tenantId: parsed.tenantId,
    owner: options.owner,
    emittedAt: parsed.occurredAt,
    source: { kind: 'legal', id: parsed.resourceRef ?? parsed.id },
    correlationId: parsed.correlationId,
    payload: {
      legalType: parsed.type,
      payloadHash: hashJson(parsed.payload),
    },
  };
  return {
    event: parseStrict(systemEventV1Schema, candidate, 'system event'),
    hostMapping: 'MAPPED',
  };
}
