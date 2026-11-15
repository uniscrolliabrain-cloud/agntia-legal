import { LegalError } from '../domain/errors.js';
import { isoDateSchema } from '../domain/ids.js';

export interface DeadlineRule {
  id: string;
  version: number;
  territory: string;
  dayCount: number;
  dayType: 'business' | 'calendar';
  startRule: 'same_day' | 'next_day';
}

export interface DeadlineTrigger {
  id: string;
  occurredAt: string;
  /** Proof of the triggering event. Without it no date may be computed. */
  evidenceRef: string | null;
}

export interface HolidayCalendar {
  territory: string;
  version: string;
  holidays: readonly string[];
}

export interface ProposeDeadlineInput {
  matterId: string;
  rule: DeadlineRule;
  trigger: DeadlineTrigger;
  calendar: HolidayCalendar;
  applicableTerritory: string;
  asOf: Date;
  reviewRef?: string | null;
}

export interface DeadlineComputation {
  ruleId: string;
  ruleVersion: number;
  calendarVersion: string;
  startDate: string;
  dayCount: number;
  dayType: 'business' | 'calendar';
  skipped: string[];
}

export interface DeadlineProposalResult {
  status: 'blocked' | 'proposed' | 'ready_for_approval';
  dueDate: string | null;
  computedFrom: string | null;
  requiresReview: boolean;
  reasons: string[];
  computation: DeadlineComputation | null;
}

const DAY_MS = 86_400_000;

function toUtcMs(value: string, field: string): number {
  if (!isoDateSchema.safeParse(value).success) {
    throw new LegalError('INVALID_INPUT', `Invalid ${field}`, { details: { field, value } });
  }
  return new Date(`${value}T00:00:00Z`).getTime();
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function isWeekend(ms: number): boolean {
  const day = new Date(ms).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Deterministic deadline proposal.
 *
 * Requirements encoded here: a versioned rule, a proven triggering event, a
 * versioned calendar for the territory and a mandatory human review. The model
 * never supplies the date; a chat sentence is not a trigger.
 */
export function proposeDeadline(input: ProposeDeadlineInput): DeadlineProposalResult {
  const reasons: string[] = [];

  if (!Number.isInteger(input.rule.version) || input.rule.version < 1) {
    reasons.push('MISSING_RULE_VERSION');
  }
  if (!Number.isInteger(input.rule.dayCount) || input.rule.dayCount < 1) {
    reasons.push('INVALID_DAY_COUNT');
  }
  if (input.rule.territory !== input.applicableTerritory) {
    reasons.push('RULE_TERRITORY_MISMATCH');
  }
  if (input.calendar.territory !== input.applicableTerritory) {
    reasons.push('CALENDAR_TERRITORY_MISMATCH');
  }
  if (!input.calendar.version || input.calendar.version.trim().length === 0) {
    reasons.push('MISSING_CALENDAR_VERSION');
  }
  if (!input.trigger.evidenceRef) {
    reasons.push('MISSING_TRIGGER_PROOF');
  }

  let triggerMs: number | null = null;
  try {
    triggerMs = toUtcMs(input.trigger.occurredAt, 'trigger.occurredAt');
  } catch {
    reasons.push('INVALID_TRIGGER_DATE');
  }

  const asOfMs = input.asOf.getTime();
  if (triggerMs !== null && triggerMs > asOfMs) {
    reasons.push('TRIGGER_AFTER_AS_OF');
  }

  if (reasons.length > 0 || triggerMs === null) {
    return {
      status: 'blocked',
      dueDate: null,
      computedFrom: null,
      requiresReview: true,
      reasons,
      computation: null,
    };
  }

  const holidays = new Set(input.calendar.holidays);
  const startMs = input.rule.startRule === 'next_day' ? triggerMs + DAY_MS : triggerMs;
  const skipped: string[] = [];

  let dueMs: number;
  if (input.rule.dayType === 'calendar') {
    dueMs = startMs + input.rule.dayCount * DAY_MS;
  } else {
    let cursor = startMs;
    let counted = 0;
    while (counted < input.rule.dayCount) {
      const iso = toIsoDate(cursor);
      if (isWeekend(cursor) || holidays.has(iso)) {
        skipped.push(iso);
      } else {
        counted += 1;
        if (counted === input.rule.dayCount) break;
      }
      cursor += DAY_MS;
    }
    dueMs = cursor;
  }

  const dueDate = toIsoDate(dueMs);
  return {
    status: input.reviewRef ? 'ready_for_approval' : 'proposed',
    dueDate,
    computedFrom: input.trigger.occurredAt,
    requiresReview: true,
    reasons: [],
    computation: {
      ruleId: input.rule.id,
      ruleVersion: input.rule.version,
      calendarVersion: input.calendar.version,
      startDate: toIsoDate(startMs),
      dayCount: input.rule.dayCount,
      dayType: input.rule.dayType,
      skipped,
    },
  };
}
