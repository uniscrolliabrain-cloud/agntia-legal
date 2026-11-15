import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';

/**
 * Audit entry. It references resources and actors, never client payloads,
 * tokens or prompts: logs/metrics must not become a second uncontrolled copy
 * of private data.
 */
export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  resourceId: string | null;
  correlationId: string | null;
  occurredAt: string;
  outcome: 'allowed' | 'blocked' | 'failed';
  details: Record<string, string | number | boolean | null>;
}

export interface AuditInput {
  tenantId: string;
  actorId: string;
  action: string;
  resourceId?: string | null;
  correlationId?: string | null;
  occurredAt: string;
  outcome: AuditEvent['outcome'];
  details?: Record<string, string | number | boolean | null>;
}

const FORBIDDEN_DETAIL_KEY = /(payload|secret|token|password|prompt|content|credential|api[_-]?key)/i;

export class AuditLog {
  private readonly events: AuditEvent[] = [];

  constructor(private readonly capacity = 10_000) {}

  record(input: AuditInput): AuditEvent {
    for (const key of Object.keys(input.details ?? {})) {
      if (FORBIDDEN_DETAIL_KEY.test(key)) {
        throw new LegalError('INVALID_INPUT', 'Audit details must not retain payloads or secrets', {
          details: { key },
        });
      }
    }
    const event: AuditEvent = {
      id: `aud_${randomUUID()}`,
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      resourceId: input.resourceId ?? null,
      correlationId: input.correlationId ?? null,
      occurredAt: input.occurredAt,
      outcome: input.outcome,
      details: { ...(input.details ?? {}) },
    };
    this.events.push(event);
    if (this.events.length > this.capacity) this.events.shift();
    return { ...event };
  }

  list(tenantId: string): AuditEvent[] {
    return this.events.filter((event) => event.tenantId === tenantId).map((event) => ({ ...event }));
  }

  find(tenantId: string, action: string): AuditEvent[] {
    return this.list(tenantId).filter((event) => event.action === action);
  }
}
