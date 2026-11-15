import { LegalError } from '../domain/errors.js';

export interface MemoCitation {
  citation: string;
  status: string;
}

export interface MemoInput {
  issue: string;
  citations: readonly MemoCitation[];
  requiredQuestions: readonly string[];
  answeredQuestions: readonly string[];
  contraryAuthorities?: readonly string[];
}

export interface MemoResult {
  status: 'needs_review' | 'proposed';
  requiresReview: true;
  reasons: string[];
  coverage: {
    required: number;
    answered: number;
    missing: string[];
  };
  contraryAuthorities: string[];
}

/**
 * A memo is a proposal, never a conclusion: it needs at least one verified
 * authority, every required question answered, and it preserves contrary
 * authorities instead of hiding them.
 */
export function proposeMemo(input: MemoInput): MemoResult {
  if (input.issue.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'A memo needs an issue');
  }

  const reasons: string[] = [];
  if (input.citations.length === 0) {
    reasons.push('NO_AUTHORITIES');
  }
  for (const citation of input.citations) {
    if (citation.status !== 'verified') {
      reasons.push(`UNVERIFIED_AUTHORITY:${citation.citation}`);
    }
  }

  const answered = new Set(input.answeredQuestions);
  const missing = input.requiredQuestions.filter((question) => !answered.has(question));
  for (const question of missing) {
    reasons.push(`MISSING_QUESTION:${question}`);
  }

  return {
    status: reasons.length === 0 ? 'proposed' : 'needs_review',
    requiresReview: true,
    reasons,
    coverage: {
      required: input.requiredQuestions.length,
      answered: input.requiredQuestions.length - missing.length,
      missing,
    },
    contraryAuthorities: [...(input.contraryAuthorities ?? [])],
  };
}
