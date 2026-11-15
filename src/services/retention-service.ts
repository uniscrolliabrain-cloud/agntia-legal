import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import { retentionHoldSchema, type RetentionHold } from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import { parseStrict } from '../domain/validate.js';

export interface PlaceHoldInput {
  retentionRule: string;
  holdScope: string;
  requesterProof: string;
  exportAcl?: string[];
  /** Optional scheduled expiry; without it the hold persists until released. */
  expiresAt?: string | null;
}

export interface ReleaseHoldInput {
  holdId: string;
  actorId: string;
  proofRef: string;
}

/**
 * Legal hold: while active it blocks export/deletion for its scope, and it can
 * only be released by a different actor with a proof reference.
 */
export class RetentionService {
  constructor(private readonly holds: Repository<RetentionHold>) {}

  async place(
    tenantId: string,
    actorId: string,
    input: PlaceHoldInput,
    now: Date,
  ): Promise<RetentionHold> {
    const timestamp = now.toISOString();
    const hold = parseStrict(
      retentionHoldSchema,
      {
        id: `hld_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        retentionRule: input.retentionRule,
        holdScope: input.holdScope,
        requesterProof: input.requesterProof,
        requestedBy: actorId,
        exportAcl: input.exportAcl ?? [],
        expiresAt: input.expiresAt ?? null,
        status: 'active',
      },
      'retention hold',
    );
    return this.holds.create(hold);
  }

  async release(
    tenantId: string,
    input: ReleaseHoldInput,
    now: Date,
  ): Promise<RetentionHold> {
    const hold = await this.holds.get(tenantId, input.holdId);
    if (!hold) {
      throw new LegalError('NOT_FOUND', 'Retention hold not found', {
        details: { reason: 'HOLD_NOT_FOUND' },
      });
    }
    if (hold.status !== 'active') {
      throw new LegalError('BLOCKED', 'Only an active hold can be released', {
        details: { reason: 'HOLD_NOT_ACTIVE', status: hold.status },
      });
    }
    if (hold.requestedBy && hold.requestedBy === input.actorId) {
      throw new LegalError('BLOCKED', 'The requester cannot release their own hold', {
        details: { reason: 'SELF_RELEASE_NOT_ALLOWED' },
      });
    }
    if (input.proofRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'A release proof reference is required', {
        details: { reason: 'RELEASE_PROOF_REQUIRED' },
      });
    }

    const timestamp = now.toISOString();
    const updated = parseStrict(
      retentionHoldSchema,
      {
        ...hold,
        status: 'released',
        version: hold.version + 1,
        updatedAt: timestamp,
      },
      'hold release',
    );
    return this.holds.update(updated, hold.version);
  }

  async activeHolds(tenantId: string, now: Date = new Date()): Promise<RetentionHold[]> {
    return (await this.holds.list(tenantId)).filter(
      (hold) => hold.status === 'active' && !this.isExpired(hold, now),
    );
  }

  /**
   * Scheduled sweep: an active hold whose expiry passed becomes `expired`. It is
   * never deleted, so history and audit remain intact.
   */
  async expireDue(tenantId: string, now: Date): Promise<RetentionHold[]> {
    const expired: RetentionHold[] = [];
    for (const hold of await this.holds.list(tenantId)) {
      if (hold.status !== 'active' || !this.isExpired(hold, now)) continue;
      const updated = parseStrict(
        retentionHoldSchema,
        { ...hold, status: 'expired', version: hold.version + 1, updatedAt: now.toISOString() },
        'hold expiry',
      );
      expired.push(await this.holds.update(updated, hold.version));
    }
    return expired;
  }

  private isExpired(hold: RetentionHold, now: Date): boolean {
    return hold.expiresAt !== null && new Date(hold.expiresAt).getTime() <= now.getTime();
  }

  async assertExportAllowed(
    tenantId: string,
    scope: string,
    now: Date = new Date(),
  ): Promise<void> {
    const holds = await this.activeHolds(tenantId, now);
    const blocking = holds.filter(
      (hold) => hold.holdScope === '*' || hold.holdScope === scope || scope.startsWith(hold.holdScope),
    );
    if (blocking.length > 0) {
      throw new LegalError('BLOCKED', 'Export blocked by an active retention hold', {
        details: {
          reason: 'RETENTION_HOLD_ACTIVE',
          holds: blocking.map((hold) => hold.id),
        },
      });
    }
  }
}
