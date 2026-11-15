import { describe, expect, it } from 'vitest';
import { proposeDeadline, type ProposeDeadlineInput } from '../../src/core/deadline.js';

const base: ProposeDeadlineInput = {
  matterId: 'mat_1',
  rule: {
    id: 'rule-15d',
    version: 2,
    territory: 'ES',
    dayCount: 3,
    dayType: 'business',
    startRule: 'next_day',
  },
  trigger: {
    id: 'trg_1',
    occurredAt: '2026-01-09',
    evidenceRef: 'evd_1',
  },
  calendar: {
    territory: 'ES',
    version: '2026a',
    holidays: ['2026-01-13'],
  },
  applicableTerritory: 'ES',
  asOf: new Date('2026-01-20T00:00:00.000Z'),
};

describe('deadline proposal', () => {
  it('counts business days, skipping weekends and holidays', () => {
    const result = proposeDeadline(base);
    expect(result.status).toBe('proposed');
    expect(result.dueDate).toBe('2026-01-15');
    expect(result.computation?.skipped).toContain('2026-01-10');
    expect(result.computation?.skipped).toContain('2026-01-13');
    expect(result.computation?.ruleVersion).toBe(2);
    expect(result.computation?.calendarVersion).toBe('2026a');
  });

  it('requires human review even when the computation succeeds', () => {
    expect(proposeDeadline(base).requiresReview).toBe(true);
  });

  it('marks ready_for_approval once a review is recorded', () => {
    const result = proposeDeadline({ ...base, reviewRef: 'rev_9' });
    expect(result.status).toBe('ready_for_approval');
  });

  it('blocks without proof of the triggering event', () => {
    const result = proposeDeadline({
      ...base,
      trigger: { ...base.trigger, evidenceRef: null },
    });
    expect(result.status).toBe('blocked');
    expect(result.dueDate).toBeNull();
    expect(result.reasons).toContain('MISSING_TRIGGER_PROOF');
  });

  it('blocks when the rule belongs to another territory', () => {
    const result = proposeDeadline({ ...base, applicableTerritory: 'ES-CT' });
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('RULE_TERRITORY_MISMATCH');
    expect(result.reasons).toContain('CALENDAR_TERRITORY_MISMATCH');
  });

  it('blocks a trigger dated after the as-of date', () => {
    const result = proposeDeadline({ ...base, asOf: new Date('2026-01-05T00:00:00.000Z') });
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('TRIGGER_AFTER_AS_OF');
  });

  it('blocks without a versioned calendar', () => {
    const result = proposeDeadline({ ...base, calendar: { ...base.calendar, version: '' } });
    expect(result.reasons).toContain('MISSING_CALENDAR_VERSION');
  });

  it('recomputes when the trigger date changes', () => {
    const first = proposeDeadline(base);
    const second = proposeDeadline({
      ...base,
      trigger: { ...base.trigger, occurredAt: '2026-01-12' },
    });
    expect(first.dueDate).not.toBe(second.dueDate);
    expect(second.dueDate).toBe('2026-01-16');
  });

  it('computes calendar days without business-day skipping', () => {
    const result = proposeDeadline({
      ...base,
      rule: { ...base.rule, dayType: 'calendar', dayCount: 5 },
    });
    expect(result.dueDate).toBe('2026-01-15');
    expect(result.computation?.skipped).toEqual([]);
  });
});
