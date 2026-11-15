import { hashJson } from '../core/hash.js';
import { LegalError } from '../domain/errors.js';
import type { TenantArchive } from '../services/export-service.js';

export interface BackupManifest {
  version: 1;
  tenantId: string;
  createdAt: string;
  storageRef: string;
  counts: {
    matters: number;
    facts: number;
    holds: number;
    revokedUsers: number;
  };
  archiveHash: string;
}

export function createBackupManifest(input: {
  archive: TenantArchive;
  storageRef: string;
  now: Date;
}): BackupManifest {
  if (input.storageRef.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'A backup storage reference is required');
  }
  if (input.archive.tenantId.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'Archive has no tenant');
  }

  return {
    version: 1,
    tenantId: input.archive.tenantId,
    createdAt: input.now.toISOString(),
    storageRef: input.storageRef,
    counts: {
      matters: input.archive.matters.length,
      facts: input.archive.facts.length,
      holds: input.archive.holds.length,
      revokedUsers: input.archive.revokedUserIds.length,
    },
    archiveHash: hashJson(input.archive),
  };
}

export function verifyBackupManifest(
  manifest: BackupManifest,
  archive: TenantArchive,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (manifest.tenantId !== archive.tenantId) reasons.push('TENANT_MISMATCH');
  if (manifest.archiveHash !== hashJson(archive)) reasons.push('ARCHIVE_HASH_MISMATCH');
  if (manifest.counts.matters !== archive.matters.length) reasons.push('MATTER_COUNT_MISMATCH');
  if (manifest.counts.facts !== archive.facts.length) reasons.push('FACT_COUNT_MISMATCH');
  if (manifest.counts.holds !== archive.holds.length) reasons.push('HOLD_COUNT_MISMATCH');
  if (manifest.counts.revokedUsers !== archive.revokedUserIds.length) {
    reasons.push('REVOKED_USER_COUNT_MISMATCH');
  }

  return { ok: reasons.length === 0, reasons };
}
