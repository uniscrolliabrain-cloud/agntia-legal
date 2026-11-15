import { describe, expect, it } from 'vitest';
import { LegalError } from '../../src/domain/errors.js';
import {
  assertDomainTransition,
  assertOperationTransition,
  canApplyDomainTransition,
  checkDomainTransition,
  isTerminalDomainState,
} from '../../src/domain/states.js';

function capture(fn: () => void): LegalError {
  try {
    fn();
  } catch (error) {
    if (error instanceof LegalError) return error;
    throw error;
  }
  throw new Error('expected a LegalError');
}

describe('domain state machine', () => {
  it('allows the documented happy path', () => {
    assertDomainTransition('intake', 'scope_pending');
    assertDomainTransition('scope_pending', 'conflict_review');
    assertDomainTransition('conflict_review', 'fact_gathering', { hasOpenConflicts: false });
    assertDomainTransition('fact_gathering', 'research');
    assertDomainTransition('research', 'draft');
    assertDomainTransition('draft', 'professional_review');
    assertDomainTransition('professional_review', 'approved_draft', {
      competentReviewRef: 'rev_1',
      reviewerIsProposer: false,
      pendingRequiredFacts: 0,
      hasOpenConflicts: false,
    });
    assertDomainTransition('approved_draft', 'delivered', { approvalValid: true });
  });

  it('rejects an illegal jump', () => {
    const error = capture(() => assertDomainTransition('intake', 'delivered'));
    expect(error.code).toBe('BLOCKED');
    expect(error.details.reasons).toContain('ILLEGAL_TRANSITION:intake->delivered');
    expect(canApplyDomainTransition('intake', 'delivered')).toBe(false);
  });

  it('requires a competent review before approval of a draft', () => {
    const reasons = checkDomainTransition('professional_review', 'approved_draft', {});
    expect(reasons).toContain('COMPETENT_REVIEW_REQUIRED');
  });

  it('does not accept self-review by the proposer', () => {
    const reasons = checkDomainTransition('professional_review', 'approved_draft', {
      competentReviewRef: 'rev_1',
      reviewerIsProposer: true,
    });
    expect(reasons).toContain('SELF_REVIEW_NOT_SUFFICIENT');
  });

  it('blocks approval while required facts are pending', () => {
    const reasons = checkDomainTransition('professional_review', 'approved_draft', {
      competentReviewRef: 'rev_1',
      pendingRequiredFacts: 2,
    });
    expect(reasons).toContain('PENDING_REQUIRED_FACTS');
  });

  it('does not deliver without a valid approval', () => {
    const reasons = checkDomainTransition('approved_draft', 'delivered', {});
    expect(reasons).toContain('VALID_APPROVAL_REQUIRED');
  });

  it('keeps an open conflict as a hard blocker', () => {
    const error = capture(() =>
      assertDomainTransition('conflict_review', 'fact_gathering', { hasOpenConflicts: true }),
    );
    expect(error.details.reasons).toContain('OPEN_CONFLICT_REVIEW');
  });

  it('exposes terminal states', () => {
    expect(isTerminalDomainState('closed')).toBe(true);
    expect(isTerminalDomainState('draft')).toBe(false);
  });
});

describe('operation state machine', () => {
  it('accepts confirmation only with a verified outcome and receipt', () => {
    expect(() => assertOperationTransition('accepted', 'confirmed', {})).toThrow(LegalError);
    assertOperationTransition('accepted', 'confirmed', { hasReceipt: true, outcomeVerified: true });
  });

  it('cannot confirm straight from running without a receipt', () => {
    const error = capture(() =>
      assertOperationTransition('running', 'confirmed', { outcomeVerified: true }),
    );
    expect(error.details.reasons).toContain('RECEIPT_REQUIRED');
  });
});
