import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';

export type OutboxState = 'pending' | 'claimed' | 'acknowledged' | 'failed';

export interface OutboxRecord {
  id: string;
  tenantId: string;
  eventId: string;
  type: string;
  payloadHash: string;
  state: OutboxState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  lastError: string | null;
}

export interface EnqueueInput {
  tenantId: string;
  eventId: string;
  type: string;
  payloadHash: string;
  now: Date;
}

/**
 * Outbox semantics: enqueue is part of the local commit, dispatch is
 * at-least-once, and an emitted event is not a delivered event until the
 * receiver acknowledges it after its own commit.
 */
export class Outbox {
  private readonly records: OutboxRecord[] = [];

  enqueue(input: EnqueueInput): OutboxRecord {
    const timestamp = input.now.toISOString();
    const record: OutboxRecord = {
      id: `obx_${randomUUID()}`,
      tenantId: input.tenantId,
      eventId: input.eventId,
      type: input.type,
      payloadHash: input.payloadHash,
      state: 'pending',
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      acknowledgedAt: null,
      lastError: null,
    };
    this.records.push(record);
    return { ...record };
  }

  pending(tenantId: string): OutboxRecord[] {
    return this.records
      .filter((record) => record.tenantId === tenantId && (record.state === 'pending' || record.state === 'claimed'))
      .map((record) => ({ ...record }));
  }

  claim(tenantId: string, limit: number, now: Date): OutboxRecord[] {
    const claimed: OutboxRecord[] = [];
    for (const record of this.records) {
      if (claimed.length >= limit) break;
      if (record.tenantId !== tenantId || record.state !== 'pending') continue;
      record.state = 'claimed';
      record.attempts += 1;
      record.updatedAt = now.toISOString();
      claimed.push({ ...record });
    }
    return claimed;
  }

  /** Only the receiver's acknowledgement moves the record to acknowledged. */
  acknowledge(tenantId: string, id: string, now: Date): OutboxRecord {
    const record = this.find(tenantId, id);
    if (record.state !== 'claimed') {
      throw new LegalError('BLOCKED', 'Acknowledgement requires a claimed delivery', {
        details: { reason: 'ACK_WITHOUT_CLAIM', state: record.state },
      });
    }
    record.state = 'acknowledged';
    record.acknowledgedAt = now.toISOString();
    record.updatedAt = now.toISOString();
    return { ...record };
  }

  fail(tenantId: string, id: string, reason: string, now: Date): OutboxRecord {
    const record = this.find(tenantId, id);
    record.state = 'failed';
    record.lastError = reason;
    record.updatedAt = now.toISOString();
    return { ...record };
  }

  isAcknowledged(tenantId: string, id: string): boolean {
    return this.find(tenantId, id).state === 'acknowledged';
  }

  private find(tenantId: string, id: string): OutboxRecord {
    const record = this.records.find((candidate) => candidate.tenantId === tenantId && candidate.id === id);
    if (!record) {
      throw new LegalError('NOT_FOUND', 'Outbox record not found', {
        details: { reason: 'OUTBOX_NOT_FOUND' },
      });
    }
    return record;
  }
}
