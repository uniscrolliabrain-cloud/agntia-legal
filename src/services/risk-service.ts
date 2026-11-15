import { LegalError } from '../domain/errors.js';

export type RiskSeverity = 'low' | 'medium' | 'high';

export interface RiskInput {
  description: string;
  severity: RiskSeverity;
  evidenceRef: string | null;
  policyMaxSeverity?: RiskSeverity;
}

export interface RiskResult {
  status: 'reported' | 'signal_unverified';
  severity: RiskSeverity;
  requiresReview: boolean;
  reasons: string[];
}

const ORDER: Record<RiskSeverity, number> = { low: 1, medium: 2, high: 3 };

/**
 * A risk without a source is an unverified signal, not a legal opinion. A
 * severity above the policy ceiling is escalated instead of downgraded.
 */
export function proposeRisk(input: RiskInput): RiskResult {
  if (input.description.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'A risk needs a description');
  }

  const reasons: string[] = [];
  if (!input.evidenceRef) reasons.push('NO_SOURCE');
  if (input.policyMaxSeverity && ORDER[input.severity] > ORDER[input.policyMaxSeverity]) {
    reasons.push('SEVERITY_ABOVE_POLICY_CEILING');
  }

  return {
    status: input.evidenceRef ? 'reported' : 'signal_unverified',
    severity: input.severity,
    requiresReview: true,
    reasons,
  };
}
