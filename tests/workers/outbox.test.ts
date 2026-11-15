import { describe, expect, it } from 'vitest';
import { Outbox } from '../../src/workers/outbox.js';
import { TENANT_A, TENANT_B } from '../helpers/fixtures.js';

const now = new Date('2026-11-14T00:00:00.000Z');

describe('outbox', () => {
  it('does not count an emitted event as delivered', () => {
    const outbox = new Outbox();
    const record = outbox.enqueue({
      tenantId: TENANT_A,
      eventId: 'evt_1',
      type: 'legal.operation.confirmed',
      payloadHash: 'a'.repeat(64),
      now,
    });
    expect(record.state).toBe('pending');
    expect(outbox.isAcknowledged(TENANT_A, record.id)).toBe(false);
  });

  it('requires a claim before acknowledgement', () => {
    const outbox = new Outbox();
    const record = outbox.enqueue({
      tenantId: TENANT_A,
      eventId: 'evt_1',
      type: 'legal.operation.confirmed',
      payloadHash: 'a'.repeat(64),
      now,
    });
    expect(() => outbox.acknowledge(TENANT_A, record.id, now)).toThrowError(
      expect.objectContaining({ code: 'BLOCKED' }),
    );
  });

  it('acknowledges a claimed record after the receiver commit', () => {
    const outbox = new Outbox();
    const record = outbox.enqueue({
      tenantId: TENANT_A,
      eventId: 'evt_1',
      type: 'legal.operation.confirmed',
      payloadHash: 'a'.repeat(64),
      now,
    });
    const [claimed] = outbox.claim(TENANT_A, 10, now);
    expect(claimed?.id).toBe(record.id);
    expect(claimed?.attempts).toBe(1);
    const acknowledged = outbox.acknowledge(TENANT_A, record.id, now);
    expect(acknowledged.state).toBe('acknowledged');
    expect(acknowledged.acknowledgedAt).toBe(now.toISOString());
  });

  it('does not leak records across tenants', () => {
    const outbox = new Outbox();
    outbox.enqueue({
      tenantId: TENANT_A,
      eventId: 'evt_1',
      type: 'legal.operation.confirmed',
      payloadHash: 'a'.repeat(64),
      now,
    });
    expect(outbox.pending(TENANT_B)).toHaveLength(0);
    expect(outbox.pending(TENANT_A)).toHaveLength(1);
  });
});
