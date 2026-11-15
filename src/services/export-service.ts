import type { FactAssertion, LegalMatter, RetentionHold } from '../domain/entities.js';

export interface TenantArchive {
  version: 1;
  tenantId: string;
  exportedAt: string;
  matters: LegalMatter[];
  facts: FactAssertion[];
  holds: RetentionHold[];
  revokedUserIds: string[];
}

export interface BuildArchiveInput {
  tenantId: string;
  matters: readonly LegalMatter[];
  facts: readonly FactAssertion[];
  holds: readonly RetentionHold[];
  revokedUserIds?: readonly string[];
  now: Date;
}

export function buildTenantArchive(input: BuildArchiveInput): TenantArchive {
  return {
    version: 1,
    tenantId: input.tenantId,
    exportedAt: input.now.toISOString(),
    matters: input.matters.map((matter) => ({ ...matter })),
    facts: input.facts.map((fact) => ({ ...fact })),
    holds: input.holds.map((hold) => ({ ...hold })),
    revokedUserIds: [...(input.revokedUserIds ?? [])],
  };
}

export interface RestoreOptions {
  /** Matters suppressed after the backup (deleted/restricted). */
  suppressedMatterIds?: readonly string[];
  /** Users revoked after the backup; access must not be resurected. */
  revokedUserIds?: readonly string[];
  now: Date;
}

export interface RestoreResult {
  tenantId: string;
  matters: LegalMatter[];
  facts: FactAssertion[];
  holds: RetentionHold[];
  revokedUserIds: string[];
  droppedMatters: string[];
  droppedFacts: string[];
  notes: string[];
}

/**
 * Restore never widens access: matters suppressed after the backup stay out,
 * their facts are not recreated, released holds stay released and revoked users
 * remain revoked. No permission is inferred from having been in the archive.
 */
export function restoreTenantArchive(
  archive: TenantArchive,
  options: RestoreOptions,
): RestoreResult {
  const suppressed = new Set(options.suppressedMatterIds ?? []);
  const matters = archive.matters
    .filter((matter) => !suppressed.has(matter.id))
    .map((matter) => ({ ...matter }));

  const allowedMatterIds = new Set(matters.map((matter) => matter.id));
  const facts = archive.facts
    .filter((fact) => allowedMatterIds.has(fact.matterId))
    .map((fact) => ({ ...fact }));
  const droppedFacts = archive.facts
    .filter((fact) => !allowedMatterIds.has(fact.matterId))
    .map((fact) => fact.id);

  const revokedUserIds = [
    ...new Set([...archive.revokedUserIds, ...(options.revokedUserIds ?? [])]),
  ];

  return {
    tenantId: archive.tenantId,
    matters,
    facts,
    holds: archive.holds.map((hold) => ({ ...hold })),
    revokedUserIds,
    droppedMatters: archive.matters
      .filter((matter) => suppressed.has(matter.id))
      .map((matter) => matter.id),
    droppedFacts,
    notes: [
      'RESTRICTIONS_REAPPLIED',
      'NO_PERMISSION_FROM_ARCHIVE',
      `RESTORED_AT:${options.now.toISOString()}`,
    ],
  };
}
