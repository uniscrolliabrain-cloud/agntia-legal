import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import {
  conflictCheckSchema,
  legalMatterSchema,
  type ConflictCheck,
  type LegalMatter,
} from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import type { DomainState, TransitionGuardContext } from '../domain/states.js';
import { assertDomainTransition } from '../domain/states.js';
import { parseStrict } from '../domain/validate.js';
import type { AuditLog } from '../persistence/audit.js';

export interface IntakeInput {
  requestingActorId: string;
  title: string;
  purpose: string;
  territory: string;
  applicableDate: string;
  requestedAction: string;
  /** When the scope is incomplete the matter stays in `intake`. */
  scopeComplete?: boolean;
}

export interface ConflictCheckInput {
  matterId: string;
  partyRefs: string[];
  representation: string;
  result: ConflictCheck['result'];
  reviewerRef?: string | null;
  notes?: string;
}

export interface TransitionInput {
  tenantId: string;
  matterId: string;
  to: DomainState;
  expectedVersion: number;
  actorId: string;
  now: Date;
  correlationId?: string | null;
  context?: TransitionGuardContext;
}

export class MatterService {
  constructor(
    private readonly matters: Repository<LegalMatter>,
    private readonly conflicts: Repository<ConflictCheck>,
    private readonly audit: AuditLog,
  ) {}

  async intake(
    tenantId: string,
    actorId: string,
    input: IntakeInput,
    now: Date,
  ): Promise<LegalMatter> {
    const timestamp = now.toISOString();
    const matter = parseStrict(
      legalMatterSchema,
      {
        id: `mat_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        requestingActorId: input.requestingActorId,
        title: input.title,
        purpose: input.purpose,
        territory: input.territory,
        applicableDate: input.applicableDate,
        requestedAction: input.requestedAction,
        state: input.scopeComplete === true ? 'scope_pending' : 'intake',
        scopeRef: null,
        conflictCheckRef: null,
        reviewerRef: null,
        approvalRef: null,
        blockers: [],
      },
      'matter',
    );

    const created = await this.matters.create(matter);
    this.audit.record({
      tenantId,
      actorId,
      action: 'legal.matter.intake',
      resourceId: created.id,
      occurredAt: timestamp,
      outcome: 'allowed',
      details: { state: created.state, territory: created.territory },
    });
    return created;
  }

  async get(tenantId: string, matterId: string): Promise<LegalMatter> {
    const matter = await this.matters.get(tenantId, matterId);
    if (!matter) {
      throw new LegalError('NOT_FOUND', 'Matter not found', {
        details: { reason: 'MATTER_NOT_FOUND' },
      });
    }
    return matter;
  }

  async recordConflictCheck(
    tenantId: string,
    actorId: string,
    input: ConflictCheckInput,
    now: Date,
  ): Promise<ConflictCheck> {
    const matter = await this.get(tenantId, input.matterId);
    if (matter.state === 'closed') {
      throw new LegalError('BLOCKED', 'Closed matter cannot receive new conflict checks', {
        details: { reason: 'MATTER_CLOSED' },
      });
    }
    const timestamp = now.toISOString();
    const check = parseStrict(
      conflictCheckSchema,
      {
        id: `cnf_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        matterId: input.matterId,
        partyRefs: input.partyRefs,
        representation: input.representation,
        result: input.result,
        requestedBy: actorId,
        reviewerRef: input.reviewerRef ?? null,
        notes: input.notes ?? '',
      },
      'conflict check',
    );
    const created = await this.conflicts.create(check);
    this.audit.record({
      tenantId,
      actorId,
      action: 'legal.conflicts.record',
      resourceId: created.id,
      occurredAt: timestamp,
      outcome: 'allowed',
      details: { result: created.result, matterId: created.matterId },
    });
    return created;
  }

  /**
   * Conflict review can only be cleared or upheld by a reviewer other than the
   * actor who requested the check; a confirmed conflict cannot be cleared.
   */
  async reviewConflict(
    input: {
      tenantId: string;
      actorId: string;
      checkId: string;
      reviewerRef: string;
      decision: 'cleared' | 'upheld' | 'needs_more_data';
      rationale: string;
      now: Date;
    },
  ): Promise<ConflictCheck> {
    const check = await this.conflicts.get(input.tenantId, input.checkId);
    if (!check) {
      throw new LegalError('NOT_FOUND', 'Conflict check not found', {
        details: { reason: 'CONFLICT_CHECK_NOT_FOUND' },
      });
    }
    if (check.requestedBy && check.requestedBy === input.actorId) {
      throw new LegalError('BLOCKED', 'The requester cannot review their own conflict check', {
        details: { reason: 'SELF_REVIEW_NOT_SUFFICIENT' },
      });
    }
    if (input.decision === 'cleared' && check.result === 'conflict') {
      throw new LegalError('BLOCKED', 'A confirmed conflict cannot be cleared', {
        details: { reason: 'CONFIRMED_CONFLICT_CANNOT_BE_CLEARED' },
      });
    }
    if (!input.reviewerRef) {
      throw new LegalError('BLOCKED', 'A reviewer reference is required', {
        details: { reason: 'REVIEWER_REF_REQUIRED' },
      });
    }

    const result =
      input.decision === 'cleared'
        ? 'clear'
        : input.decision === 'upheld'
          ? 'conflict'
          : 'insufficient_data';
    const timestamp = input.now.toISOString();

    const updated = parseStrict(
      conflictCheckSchema,
      {
        ...check,
        result,
        reviewerRef: input.reviewerRef,
        notes: [check.notes, input.rationale].filter((entry) => entry.length > 0).join('\n'),
        version: check.version + 1,
        updatedAt: timestamp,
      },
      'conflict review',
    );

    const saved = await this.conflicts.update(updated, check.version);
    this.audit.record({
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: 'legal.conflicts.review',
      resourceId: saved.id,
      occurredAt: timestamp,
      outcome: 'allowed',
      details: { decision: input.decision, result },
    });
    return saved;
  }

  async openConflictCount(tenantId: string, matterId: string): Promise<number> {
    const checks = await this.conflicts.list(tenantId);
    return checks.filter(
      (check) =>
        check.matterId === matterId &&
        check.reviewerRef === null &&
        (check.result === 'possible_conflict' || check.result === 'conflict'),
    ).length;
  }

  async transition(input: TransitionInput): Promise<LegalMatter> {
    const matter = await this.get(input.tenantId, input.matterId);
    const openConflicts = await this.openConflictCount(input.tenantId, input.matterId);

    // The caller can add blockers but cannot relax facts derived from storage.
    const context: TransitionGuardContext = {
      ...input.context,
      hasOpenConflicts: openConflicts > 0 || input.context?.hasOpenConflicts === true,
    };

    assertDomainTransition(matter.state, input.to, context);

    const timestamp = input.now.toISOString();
    const candidate = parseStrict(
      legalMatterSchema,
      {
        ...matter,
        state: input.to,
        version: matter.version + 1,
        updatedAt: timestamp,
        blockers: input.to === 'blocked' ? [...(context.blockers ?? [])] : [],
      },
      'matter transition',
    );

    const saved = await this.matters.update(candidate, input.expectedVersion);
    this.audit.record({
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: 'legal.matter.transition',
      resourceId: saved.id,
      correlationId: input.correlationId ?? null,
      occurredAt: timestamp,
      outcome: 'allowed',
      details: { from: matter.state, to: saved.state },
    });
    return saved;
  }
}
