import { describe, expect, it } from 'vitest';
import { toSystemEvent, type LegalEvent } from '../../src/bridge/events.js';
import { LegalError } from '../../src/domain/errors.js';

const event: LegalEvent = {
  id: 'evt_1',
  type: 'legal.operation.confirmed',
  schemaVersion: 1,
  tenantId: 'tnt_alpha',
  actorRef: { actorId: 'usr_user-1', kind: 'human' },
  occurredAt: '2026-11-14T00:00:00.000Z',
  correlationId: 'cor_1',
  causationId: null,
  resourceRef: 'mat_1',
  payload: { intentId: 'int_1', secretish: 'do-not-forward' },
};

describe('bridge event mapping', () => {
  it('maps to the native v1.0 shape with minimal payload', () => {
    const result = toSystemEvent(event, {
      hostAllowlist: ['task.completed'],
      mapping: { 'legal.operation.confirmed': 'task.completed' },
      owner: 'agntia-legal',
    });
    expect(result.hostMapping).toBe('MAPPED');
    expect(result.event?.schemaVersion).toBe('1.0');
    expect(result.event?.type).toBe('task.completed');
    expect(result.event?.source.kind).toBe('legal');
    expect(JSON.stringify(result.event)).not.toContain('do-not-forward');
    expect(result.event?.payload).toHaveProperty('payloadHash');
  });

  it('keeps the event local when no mapping is confirmed', () => {
    const result = toSystemEvent(event, {
      hostAllowlist: ['task.completed'],
      mapping: {},
      owner: 'agntia-legal',
    });
    expect(result.event).toBeNull();
    expect(result.hostMapping).toBe('HOST_MAPPING_NOT_VERIFIED');
  });

  it('does not invent a host type outside the allowlist', () => {
    const result = toSystemEvent(event, {
      hostAllowlist: ['task.updated'],
      mapping: { 'legal.operation.confirmed': 'task.completed' },
      owner: 'agntia-legal',
    });
    expect(result.event).toBeNull();
  });

  it('rejects an invented local event type', () => {
    expect(() =>
      toSystemEvent({ ...event, type: 'legal.work.done' } as unknown as LegalEvent, {
        hostAllowlist: [],
        mapping: {},
        owner: 'agntia-legal',
      }),
    ).toThrow(LegalError);
  });
});
