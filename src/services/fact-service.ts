import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import { factAssertionSchema, type FactAssertion } from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import { isFactual, type EvidenceRef } from '../domain/evidence.js';
import { parseStrict } from '../domain/validate.js';

export interface AssertFactInput {
  matterId: string;
  statement: string;
  status: FactAssertion['status'];
  evidenceRefs?: EvidenceRef[];
  contradictoryEvidenceRefs?: EvidenceRef[];
  reviewerRef?: string | null;
}

/**
 * Facts are never resolved by "the last prompt wins":
 * - `corroborated` needs reviewed factual evidence and a reviewer;
 * - a reviewed contradiction forces `contradicted` even if support exists;
 * - evidence from another tenant is rejected before storage.
 */
export class FactService {
  constructor(private readonly facts: Repository<FactAssertion>) {}

  async assert(
    tenantId: string,
    _actorId: string,
    input: AssertFactInput,
    now: Date,
  ): Promise<FactAssertion> {
    const supports = input.evidenceRefs ?? [];
    const contradicts = input.contradictoryEvidenceRefs ?? [];

    for (const evidence of [...supports, ...contradicts]) {
      if (evidence.tenantId !== tenantId) {
        throw new LegalError('FORBIDDEN', 'Evidence belongs to another tenant', {
          details: { reason: 'CROSS_TENANT_EVIDENCE' },
        });
      }
    }

    const factualSupports = supports.filter(isFactual);
    const factualContradictions = contradicts.filter(isFactual);

    if (input.status === 'corroborated') {
      if (!input.reviewerRef) {
        throw new LegalError('BLOCKED', 'Corroboration requires a human reviewer', {
          details: { reason: 'REVIEW_REQUIRED' },
        });
      }
      if (factualSupports.length === 0) {
        throw new LegalError('BLOCKED', 'Corroboration requires reviewed factual evidence', {
          details: { reason: 'CORROBORATION_REQUIRES_REVIEWED_FACT' },
        });
      }
    }

    if (input.status === 'contradicted' && factualContradictions.length === 0) {
      throw new LegalError('BLOCKED', 'Contradiction requires reviewed contrary evidence', {
        details: { reason: 'CONTRADICTION_REQUIRES_REVIEWED_EVIDENCE' },
      });
    }

    let status: FactAssertion['status'] = input.status;
    if (factualContradictions.length > 0 && status !== 'contradicted') {
      // A reviewed contradiction cannot be overridden by support.
      status = 'contradicted';
    }

    const timestamp = now.toISOString();
    const fact = parseStrict(
      factAssertionSchema,
      {
        id: `fct_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        matterId: input.matterId,
        statement: input.statement,
        status,
        evidenceRefs: supports,
        contradictoryEvidenceRefs: contradicts,
        reviewerRef: input.reviewerRef ?? null,
      },
      'fact assertion',
    );

    return this.facts.create(fact);
  }

  async list(tenantId: string, matterId?: string): Promise<FactAssertion[]> {
    const facts = await this.facts.list(tenantId);
    return matterId ? facts.filter((fact) => fact.matterId === matterId) : facts;
  }

  async contradicted(tenantId: string, matterId: string): Promise<FactAssertion[]> {
    return (await this.list(tenantId, matterId)).filter((fact) => fact.status === 'contradicted');
  }
}
