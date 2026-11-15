import { LegalError } from './errors.js';

/**
 * Domain lifecycle proposed by docs/architecture/01-arquitectura.md. These are
 * service states: they are not enums of the parent `agente` repository.
 */
export const DOMAIN_STATES = [
  'intake',
  'scope_pending',
  'conflict_review',
  'fact_gathering',
  'research',
  'draft',
  'professional_review',
  'approved_draft',
  'delivered',
  'stale',
  'blocked',
  'closed',
] as const;

export type DomainState = (typeof DOMAIN_STATES)[number];

export const OPERATION_STATES = [
  'proposed',
  'needs_review',
  'approved',
  'queued',
  'running',
  'accepted',
  'confirmed',
  'failed_definitive',
  'outcome_unknown',
  'reconciliation_required',
  'cancelled',
] as const;

export type OperationState = (typeof OPERATION_STATES)[number];

const DOMAIN_TRANSITIONS: Record<DomainState, readonly DomainState[]> = {
  intake: ['scope_pending', 'blocked', 'closed'],
  scope_pending: ['conflict_review', 'blocked', 'closed'],
  conflict_review: ['fact_gathering', 'blocked', 'closed'],
  fact_gathering: ['research', 'draft', 'blocked', 'closed'],
  research: ['draft', 'fact_gathering', 'stale', 'blocked', 'closed'],
  draft: ['professional_review', 'blocked', 'closed'],
  professional_review: ['approved_draft', 'draft', 'blocked', 'closed'],
  approved_draft: ['delivered', 'stale', 'blocked', 'closed'],
  delivered: ['stale', 'closed'],
  stale: ['research', 'draft', 'professional_review', 'blocked', 'closed'],
  blocked: ['scope_pending', 'draft', 'professional_review', 'closed'],
  closed: [],
};

const OPERATION_TRANSITIONS: Record<OperationState, readonly OperationState[]> = {
  proposed: ['needs_review', 'approved', 'cancelled'],
  needs_review: ['approved', 'cancelled', 'failed_definitive'],
  approved: ['queued', 'cancelled'],
  queued: ['running', 'cancelled'],
  running: ['accepted', 'confirmed', 'failed_definitive', 'outcome_unknown'],
  accepted: ['confirmed', 'outcome_unknown'],
  confirmed: [],
  failed_definitive: [],
  outcome_unknown: ['confirmed', 'failed_definitive', 'reconciliation_required'],
  reconciliation_required: ['confirmed', 'failed_definitive', 'cancelled'],
  cancelled: [],
};

export interface TransitionGuardContext {
  /** A party/conflict review is still open: the matter cannot advance. */
  hasOpenConflicts?: boolean;
  /** Required structured fields still pending evidence. */
  pendingRequiredFacts?: number;
  /** Review recorded by a competent human, with a verifiable reference. */
  competentReviewRef?: string | null;
  /** True when the reviewer is the same actor that produced the proposal. */
  reviewerIsProposer?: boolean;
  /** An approval bound to the exact payload/version is valid right now. */
  approvalValid?: boolean;
  /** Explicit blockers (missing source, expired mandate, stale snapshot...). */
  blockers?: readonly string[];
}

/**
 * Returns every reason that blocks the transition. Empty array means allowed.
 * Pure and deterministic: no clock, no IO, no model.
 */
export function checkDomainTransition(
  from: DomainState,
  to: DomainState,
  context: TransitionGuardContext = {},
): string[] {
  const reasons: string[] = [];
  const allowed = DOMAIN_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    reasons.push(`ILLEGAL_TRANSITION:${from}->${to}`);
    return reasons;
  }

  const blockers = context.blockers ?? [];
  if (blockers.length > 0 && to !== 'blocked' && to !== 'closed') {
    reasons.push(...blockers.map((blocker) => `BLOCKER:${blocker}`));
  }

  if (to === 'fact_gathering' && from === 'conflict_review' && context.hasOpenConflicts) {
    reasons.push('OPEN_CONFLICT_REVIEW');
  }

  if (to === 'approved_draft') {
    if (!context.competentReviewRef) reasons.push('COMPETENT_REVIEW_REQUIRED');
    if (context.reviewerIsProposer) reasons.push('SELF_REVIEW_NOT_SUFFICIENT');
    if ((context.pendingRequiredFacts ?? 0) > 0) reasons.push('PENDING_REQUIRED_FACTS');
    if (context.hasOpenConflicts) reasons.push('OPEN_CONFLICT_REVIEW');
  }

  if (to === 'delivered' && context.approvalValid !== true) {
    reasons.push('VALID_APPROVAL_REQUIRED');
  }

  return reasons;
}

export function assertDomainTransition(
  from: DomainState,
  to: DomainState,
  context: TransitionGuardContext = {},
): void {
  const reasons = checkDomainTransition(from, to, context);
  if (reasons.length > 0) {
    throw new LegalError('BLOCKED', 'Domain transition rejected by deterministic guards', {
      details: { from, to, reasons },
    });
  }
}

export function isTerminalDomainState(state: DomainState): boolean {
  return DOMAIN_TRANSITIONS[state].length === 0;
}

export function canApplyDomainTransition(from: DomainState, to: DomainState): boolean {
  return DOMAIN_TRANSITIONS[from].includes(to);
}

export interface OperationTransitionContext {
  /** The attempt has a durable receipt/remote reference. */
  hasReceipt?: boolean;
  /** The effect was verified, not merely accepted by the provider. */
  outcomeVerified?: boolean;
}

export function checkOperationTransition(
  from: OperationState,
  to: OperationState,
  context: OperationTransitionContext = {},
): string[] {
  if (!OPERATION_TRANSITIONS[from].includes(to)) {
    return [`ILLEGAL_OPERATION_TRANSITION:${from}->${to}`];
  }
  const reasons: string[] = [];
  if (to === 'confirmed' && context.outcomeVerified !== true) {
    reasons.push('OUTCOME_NOT_VERIFIED');
  }
  if (to === 'confirmed' && context.hasReceipt !== true) {
    reasons.push('RECEIPT_REQUIRED');
  }
  return reasons;
}

export function assertOperationTransition(
  from: OperationState,
  to: OperationState,
  context: OperationTransitionContext = {},
): void {
  const reasons = checkOperationTransition(from, to, context);
  if (reasons.length > 0) {
    throw new LegalError('BLOCKED', 'Operation transition rejected by deterministic guards', {
      details: { from, to, reasons },
    });
  }
}

export function isTerminalOperationState(state: OperationState): boolean {
  return OPERATION_TRANSITIONS[state].length === 0;
}
