import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import { reviewOpinionSchema, type ReviewOpinion } from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import { parseStrict } from '../domain/validate.js';

export interface RecordReviewInput {
  matterId: string;
  reviewerId: string;
  /** Actor that produced the draft; a reviewer cannot be the proposer. */
  proposerActorId: string;
  reviewerQualification: string;
  scope: string;
  findings: string[];
  decision: 'approved' | 'rejected' | 'needs_changes';
  signedDecisionRef: string;
}

/**
 * A review is a human, verifiable act bound to a signed decision reference.
 * The twin/agent cannot certify its own work.
 */
export class ReviewService {
  constructor(private readonly reviews: Repository<ReviewOpinion>) {}

  async record(tenantId: string, input: RecordReviewInput, now: Date): Promise<ReviewOpinion> {
    if (input.reviewerId === input.proposerActorId) {
      throw new LegalError('BLOCKED', 'A reviewer cannot approve their own proposal', {
        details: { reason: 'SELF_REVIEW_NOT_SUFFICIENT' },
      });
    }
    if (input.reviewerQualification.trim().length === 0) {
      throw new LegalError('BLOCKED', 'Reviewer qualification is required', {
        details: { reason: 'QUALIFICATION_REQUIRED' },
      });
    }
    if (input.findings.length === 0) {
      throw new LegalError('INVALID_INPUT', 'A review needs at least one finding');
    }
    if (input.signedDecisionRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'A signed decision reference is required', {
        details: { reason: 'SIGNED_DECISION_REQUIRED' },
      });
    }

    const timestamp = now.toISOString();
    const opinion = parseStrict(
      reviewOpinionSchema,
      {
        id: `rev_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        matterId: input.matterId,
        reviewerId: input.reviewerId,
        reviewerQualification: input.reviewerQualification,
        scope: input.scope,
        findings: input.findings,
        decision: input.decision,
        signedDecisionRef: input.signedDecisionRef,
      },
      'review opinion',
    );
    return this.reviews.create(opinion);
  }

  async forMatter(tenantId: string, matterId: string): Promise<ReviewOpinion[]> {
    const opinions = await this.reviews.list(tenantId);
    return opinions.filter((opinion) => opinion.matterId === matterId);
  }

  async latestApproval(tenantId: string, matterId: string): Promise<ReviewOpinion | null> {
    const opinions = await this.forMatter(tenantId, matterId);
    const approved = opinions.filter((opinion) => opinion.decision === 'approved');
    return approved.length > 0 ? (approved[approved.length - 1] ?? null) : null;
  }
}
