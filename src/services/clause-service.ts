import { LegalError } from '../domain/errors.js';

export interface ClauseInput {
  clauseType: string;
  jurisdiction: string;
  approvedOptions: readonly string[];
  proposedText: string;
}

export interface ClauseResult {
  clauseType: string;
  jurisdiction: string;
  status: 'within_playbook' | 'exception_proposed';
  matchedOption: string | null;
  requiresReview: boolean;
  reasons: string[];
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Text inside an approved option is `within_playbook`; anything else is
 * proposed as an exception requiring review. The playbook is never silently
 * rewritten to match the model output.
 */
export function proposeClause(input: ClauseInput): ClauseResult {
  if (input.approvedOptions.length === 0) {
    throw new LegalError('INVALID_INPUT', 'A playbook needs at least one approved option');
  }
  if (input.proposedText.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'A clause proposal needs text');
  }

  const proposed = normalize(input.proposedText);
  const matched = input.approvedOptions.find((option) => normalize(option) === proposed) ?? null;

  return {
    clauseType: input.clauseType,
    jurisdiction: input.jurisdiction,
    status: matched ? 'within_playbook' : 'exception_proposed',
    matchedOption: matched,
    requiresReview: matched === null,
    reasons: matched ? [] : ['OUTSIDE_APPROVED_OPTIONS'],
  };
}
