import { z } from 'zod';
import { capabilitySchema } from '../domain/envelope.js';
import { LegalError } from '../domain/errors.js';
import { isoDateTimeSchema, opaqueIdSchema } from '../domain/ids.js';
import { parseStrict } from '../domain/validate.js';

export const CAPABILITY_STATES = [
  'documented',
  'verified_runtime',
  'unknown',
  'unsupported',
  'forbidden',
  'not_configured',
] as const;

export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export const capabilityEntrySchema = z
  .object({
    operation: capabilitySchema,
    state: z.enum(CAPABILITY_STATES),
    fields: z.array(z.string().min(1).max(128)).default([]),
    edition: z.string().min(1).max(64).optional(),
    version: z.string().min(1).max(64).optional(),
    verifiedAt: isoDateTimeSchema.optional(),
    expiresAt: isoDateTimeSchema.optional(),
    evidenceRef: opaqueIdSchema.optional(),
  })
  .strict();

export type CapabilityEntry = z.infer<typeof capabilityEntrySchema>;

export const capabilityReportSchema = z
  .object({
    integrationId: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    deployment: z.string().min(1).max(128),
    edition: z.string().min(1).max(64),
    version: z.string().min(1).max(64),
    generatedAt: isoDateTimeSchema,
    entries: z.array(capabilityEntrySchema).min(1),
  })
  .strict();

export type CapabilityReport = z.infer<typeof capabilityReportSchema>;

export function buildCapabilityReport(input: unknown): CapabilityReport {
  return parseStrict(capabilityReportSchema, input, 'capability report');
}

export function stateFor(
  report: CapabilityReport,
  operation: string,
): CapabilityState {
  return report.entries.find((entry) => entry.operation === operation)?.state ?? 'unknown';
}

/**
 * A capability may only be used when it is verified at runtime and its
 * evidence is still fresh. `documented`, `unknown`, `unsupported`, `forbidden`
 * and `not_configured` all disable the operation; there is no fallback.
 */
export function assertCapability(
  report: CapabilityReport,
  operation: string,
  now: Date,
): CapabilityEntry {
  const entry = report.entries.find((candidate) => candidate.operation === operation);
  if (!entry || entry.state !== 'verified_runtime') {
    throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Provider capability is not verified', {
      details: { operation, state: entry?.state ?? 'unknown' },
    });
  }
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now.getTime()) {
    throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Provider capability verification expired', {
      details: { operation, expiresAt: entry.expiresAt },
    });
  }
  return entry;
}

/** Public projection: never exposes secret references or internal endpoints. */
export function publicCapabilities(report: CapabilityReport): Array<{
  operation: string;
  state: CapabilityState;
  fields: string[];
}> {
  return report.entries.map((entry) => ({
    operation: entry.operation,
    state: entry.state,
    fields: [...entry.fields],
  }));
}
