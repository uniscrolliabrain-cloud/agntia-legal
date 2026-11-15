import { LegalError } from '../domain/errors.js';
import { isoDateSchema } from '../domain/ids.js';
import { parseStrict } from '../domain/validate.js';

export interface TimelineEvent {
  id: string;
  at: string;
  description: string;
  /** Proof reference; without it the event is not a confirmed fact. */
  evidenceRef: string | null;
}

export interface TimelineEntry extends TimelineEvent {
  proven: boolean;
}

export interface Timeline {
  entries: TimelineEntry[];
  confirmed: TimelineEntry[];
  unproven: TimelineEntry[];
}

function validDate(value: string, label: string): void {
  if (!isoDateSchema.safeParse(value).success) {
    throw new LegalError('INVALID_INPUT', `Invalid ${label}`, { details: { field: label } });
  }
}

/**
 * Chronology is ordered and deterministic. An event without proof is shown but
 * never counted as confirmed, and cannot start a deadline.
 */
export function buildTimeline(events: readonly TimelineEvent[]): Timeline {
  const seen = new Set<string>();
  const entries: TimelineEntry[] = events.map((event) => {
    if (seen.has(event.id)) {
      throw new LegalError('INVALID_INPUT', 'Duplicate timeline event id', {
        details: { eventId: event.id },
      });
    }
    seen.add(event.id);
    validDate(event.at, 'event.at');
    return {
      id: event.id,
      at: event.at,
      description: event.description,
      evidenceRef: event.evidenceRef,
      proven: event.evidenceRef !== null && event.evidenceRef.trim().length > 0,
    };
  });

  entries.sort((left, right) =>
    left.at === right.at ? left.id.localeCompare(right.id) : left.at.localeCompare(right.at),
  );

  return {
    entries,
    confirmed: entries.filter((entry) => entry.proven),
    unproven: entries.filter((entry) => !entry.proven),
  };
}

export interface DerivedTrigger {
  status: 'blocked' | 'proposed';
  reasons: string[];
  trigger: { id: string; occurredAt: string; evidenceRef: string } | null;
}

/**
 * Only a confirmed event with proof can become the trigger of a deadline.
 */
export function deriveDeadlineTrigger(timeline: Timeline, eventId: string): DerivedTrigger {
  const entry = timeline.entries.find((candidate) => candidate.id === eventId);
  if (!entry) {
    return { status: 'blocked', reasons: ['EVENT_NOT_IN_TIMELINE'], trigger: null };
  }
  if (!entry.proven || !entry.evidenceRef) {
    return { status: 'blocked', reasons: ['MISSING_TRIGGER_PROOF'], trigger: null };
  }
  return {
    status: 'proposed',
    reasons: [],
    trigger: { id: entry.id, occurredAt: entry.at, evidenceRef: entry.evidenceRef },
  };
}

export function assertTimelineEvent(event: TimelineEvent): TimelineEvent {
  validDate(event.at, 'event.at');
  if (event.description.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'Timeline event needs a description');
  }
  parseStrict(
    isoDateSchema,
    event.at,
    'timeline date',
  );
  return { ...event };
}
