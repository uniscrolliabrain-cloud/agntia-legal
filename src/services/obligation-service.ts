import { LegalError } from '../domain/errors.js';
import { isoDateSchema } from '../domain/ids.js';

export interface ObligationInput {
  obligationSource: string;
  trigger: string;
  owner: string;
  reviewAt: string;
  signedInstrumentRef: string | null;
  instrumentStatus?: 'signed' | 'draft' | 'unknown';
}

export interface ObligationResult {
  status: 'active' | 'proposed' | 'blocked';
  reasons: string[];
  requiresReview: boolean;
}

/**
 * A contract that is not signed does not create an active obligation. Without a
 * signed instrument the proposal stays `proposed`; missing essential fields
 * block it.
 */
export function proposeObligation(input: ObligationInput): ObligationResult {
  const reasons: string[] = [];
  if (input.obligationSource.trim().length === 0) reasons.push('MISSING_SOURCE');
  if (input.trigger.trim().length === 0) reasons.push('MISSING_TRIGGER');
  if (input.owner.trim().length === 0) reasons.push('MISSING_OWNER');
  if (!isoDateSchema.safeParse(input.reviewAt).success) reasons.push('INVALID_REVIEW_DATE');

  if (reasons.length > 0) {
    return { status: 'blocked', reasons, requiresReview: true };
  }

  if (!input.signedInstrumentRef || input.instrumentStatus !== 'signed') {
    return {
      status: 'proposed',
      reasons: ['INSTRUMENT_NOT_SIGNED'],
      requiresReview: true,
    };
  }

  return { status: 'active', reasons: [], requiresReview: true };
}

export function assertObligationFields(input: ObligationInput): void {
  if (!isoDateSchema.safeParse(input.reviewAt).success) {
    throw new LegalError('INVALID_INPUT', 'Invalid obligation review date');
  }
}
