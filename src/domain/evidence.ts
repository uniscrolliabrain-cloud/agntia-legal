import { z } from 'zod';
import { LegalError } from './errors.js';
import { isoDateSchema, isoDateTimeSchema, opaqueIdSchema, sha256HexSchema } from './ids.js';

export const EVIDENCE_KINDS = ['fact', 'inference', 'user_assertion', 'observation'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * Transversal evidence reference. When projected from the parent provenance it
 * keeps source/actor/updatedAt/confidence untouched; confidence is never
 * converted into permission or into a factual claim.
 */
export const evidenceRefSchema = z
  .object({
    id: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    resourceScope: z.string().min(1).max(256),
    originalCustodian: z.string().min(1).max(256),
    sourceObjectRef: z.string().min(1).max(512),
    sourceHash: sha256HexSchema,
    mapperVersion: z.string().min(1).max(64),
    observedAt: isoDateTimeSchema,
    effectiveAt: isoDateSchema.optional(),
    kind: z.enum(EVIDENCE_KINDS),
    reviewRef: opaqueIdSchema.nullable().default(null),
  })
  .strict();

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

/**
 * A conclusion may only be supported by an evidence reference that is both a
 * fact and reviewed. Inferences, user statements and raw observations are
 * recorded but never become the basis of a delivered legal conclusion.
 */
export function isFactual(evidence: EvidenceRef): boolean {
  return evidence.kind === 'fact' && evidence.reviewRef !== null;
}

export function assertFactual(evidence: EvidenceRef, purpose: string): void {
  if (!isFactual(evidence)) {
    throw new LegalError('BLOCKED', 'Evidence cannot support a factual conclusion', {
      details: {
        purpose,
        evidenceId: evidence.id,
        kind: evidence.kind,
        reviewed: evidence.reviewRef !== null,
      },
    });
  }
}

export function partitionEvidence(evidence: readonly EvidenceRef[]): {
  factual: EvidenceRef[];
  nonFactual: EvidenceRef[];
} {
  const factual: EvidenceRef[] = [];
  const nonFactual: EvidenceRef[] = [];
  for (const entry of evidence) {
    if (isFactual(entry)) factual.push(entry);
    else nonFactual.push(entry);
  }
  return { factual, nonFactual };
}
