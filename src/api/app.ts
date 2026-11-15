import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { publicCapabilities, type CapabilityReport } from '../adapters/capability.js';
import {
  verifyCitation,
  type CitationResolver,
  type LawSnapshotLookup,
} from '../core/citation.js';
import type { DeadlineRule, DeadlineTrigger, HolidayCalendar } from '../core/deadline.js';
import { proposeDeadline } from '../core/deadline.js';
import type { ExecuteIntentInput } from '../core/intents.js';
import { IntentService } from '../core/intents.js';
import { authorize, capabilitiesForPrincipal, type Principal } from '../core/policy.js';
import type { EffectProvider } from '../core/ports.js';
import { createRedline } from '../core/redline.js';
import {
  CITATION_STATUSES,
  editOpSchema,
  factAssertionSchema,
  type LegalMatter,
} from '../domain/entities.js';
import { evidenceRefSchema } from '../domain/evidence.js';
import { LegalError, toLegalError } from '../domain/errors.js';
import { isoDateSchema, isoDateTimeSchema, opaqueIdSchema, sha256HexSchema } from '../domain/ids.js';
import { capabilitySchema } from '../domain/envelope.js';
import { DOMAIN_STATES } from '../domain/states.js';
import { parseStrict } from '../domain/validate.js';
import type { ApprovalStore } from '../services/approvals.js';
import type { DocumentService } from '../services/document-service.js';
import type { FactService } from '../services/fact-service.js';
import type { MatterService } from '../services/matter-service.js';
import type { ReviewService } from '../services/review-service.js';
import type { ReportStore } from '../services/report-store.js';
import { buildLegalReport } from '../services/reports.js';
import { extractBearer } from './auth.js';

export interface AppDeps {
  resolvePrincipal: (token: string) => Promise<Principal>;
  matters: MatterService;
  intents: IntentService;
  documents: DocumentService;
  facts: FactService;
  reviews: ReviewService;
  approvals: ApprovalStore;
  reports: ReportStore;
  citation: { resolver: CitationResolver; snapshots: LawSnapshotLookup };
  provider: EffectProvider;
  capabilities: CapabilityReport[];
  now: () => Date;
  maxBodyBytes?: number;
}

type AppEnv = {
  Variables: {
    principal: Principal;
    correlationId: string;
  };
};

const intakeBodySchema = z
  .object({
    title: z.string().min(1).max(256),
    purpose: z.string().min(1).max(512),
    territory: z.string().min(2).max(16),
    applicableDate: isoDateSchema,
    requestedAction: z.string().min(1).max(512),
    scopeComplete: z.boolean().optional(),
  })
  .strict();

const transitionBodySchema = z
  .object({
    to: z.enum(DOMAIN_STATES),
    expectedVersion: z.number().int().min(1),
    blockers: z.array(z.string().min(1).max(256)).optional(),
    competentReviewRef: z.string().min(1).max(128).nullable().optional(),
    reviewerIsProposer: z.boolean().optional(),
    pendingRequiredFacts: z.number().int().min(0).optional(),
    approvalValid: z.boolean().optional(),
  })
  .strict();

const conflictBodySchema = z
  .object({
    partyRefs: z.array(z.string().min(1).max(256)).min(1),
    representation: z.string().min(1).max(512),
    result: z.enum(['clear', 'possible_conflict', 'conflict', 'insufficient_data']),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const documentBodySchema = z
  .object({
    title: z.string().min(1).max(256),
    custodian: z.string().min(1).max(256),
    sourceRef: z.string().min(1).max(512),
    storageRef: z.string().min(1).max(512),
    contentHash: sha256HexSchema,
    mimeType: z.string().min(3).max(128),
    sizeBytes: z.number().int().min(0),
    receivedAt: isoDateTimeSchema,
    documentId: opaqueIdSchema.optional(),
  })
  .strict();

const factBodySchema = z
  .object({
    statement: z.string().min(1).max(4000),
    status: z.enum(['asserted', 'corroborated', 'contradicted', 'unverified']),
    evidenceRefs: z.array(evidenceRefSchema).max(50).optional(),
    contradictoryEvidenceRefs: z.array(evidenceRefSchema).max(50).optional(),
    reviewerRef: opaqueIdSchema.nullable().optional(),
  })
  .strict();

const conflictReviewBodySchema = z
  .object({
    reviewerRef: opaqueIdSchema,
    decision: z.enum(['cleared', 'upheld', 'needs_more_data']),
    rationale: z.string().max(2000),
  })
  .strict();

const reviewBodySchema = z
  .object({
    reviewerQualification: z.string().min(1).max(256),
    scope: z.string().min(1).max(512),
    findings: z.array(z.string().min(1).max(2000)).min(1),
    decision: z.enum(['approved', 'rejected', 'needs_changes']),
    signedDecisionRef: opaqueIdSchema,
  })
  .strict();

const citationBodySchema = z
  .object({
    citation: z.string().min(1).max(512),
    jurisdiction: z.string().min(2).max(16),
    applicableDate: isoDateSchema,
    matterId: opaqueIdSchema.nullable().optional(),
  })
  .strict();

const deadlineRuleSchema = z
  .object({
    id: opaqueIdSchema,
    version: z.number().int().min(1),
    territory: z.string().min(2).max(16),
    dayCount: z.number().int().min(1).max(3650),
    dayType: z.enum(['business', 'calendar']),
    startRule: z.enum(['same_day', 'next_day']),
  })
  .strict();

const deadlineTriggerSchema = z
  .object({
    id: opaqueIdSchema,
    occurredAt: isoDateSchema,
    evidenceRef: opaqueIdSchema.nullable(),
  })
  .strict();

const holidayCalendarSchema = z
  .object({
    territory: z.string().min(2).max(16),
    version: z.string().min(1).max(64),
    holidays: z.array(isoDateSchema).max(1000),
  })
  .strict();

const deadlineBodySchema = z
  .object({
    matterId: opaqueIdSchema,
    rule: deadlineRuleSchema,
    trigger: deadlineTriggerSchema,
    calendar: holidayCalendarSchema,
    reviewRef: opaqueIdSchema.nullable().optional(),
  })
  .strict();

const redlineBodySchema = z
  .object({
    contractRevisionId: opaqueIdSchema,
    baseHash: sha256HexSchema,
    expectedVersion: z.number().int().min(1),
    currentVersion: z.number().int().min(1),
    original: z.array(z.object({ id: opaqueIdSchema, text: z.string().max(20000) }).strict()).min(1),
    editOps: z.array(editOpSchema).min(1),
  })
  .strict();

const moneyInputSchema = z
  .object({
    amount: z.string().regex(/^-?\d+(\.\d+)?$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    exponent: z.number().int().min(0).max(8),
  })
  .strict();

const intentBodySchema = z
  .object({
    capability: capabilitySchema,
    idempotencyKey: opaqueIdSchema,
    payload: z.record(z.unknown()),
    approvalRef: opaqueIdSchema.nullable().optional(),
    operation: z
      .object({
        resourceId: opaqueIdSchema,
        resourceVersion: z.number().int().min(1),
        recipient: z.string().min(1).max(320),
        channel: z.string().min(1).max(64),
        scope: z.string().min(1).max(512),
        policyHash: sha256HexSchema,
        cost: moneyInputSchema.optional(),
      })
      .strict(),
    purpose: z.string().min(1).max(512),
    revocationVersion: z.number().int().min(0),
    dryRun: z.boolean().optional(),
  })
  .strict();

const reportBodySchema = z
  .object({
    matterId: opaqueIdSchema,
    facts: z.array(factAssertionSchema).max(500).optional(),
    citations: z
      .array(
        z
          .object({
            citation: z.string().min(1).max(512),
            status: z.enum(CITATION_STATUSES),
            reasons: z.array(z.string().min(1).max(256)),
            resolvedAuthorityRef: z.string().min(1).max(512).nullable(),
            sourceHash: sha256HexSchema.nullable(),
          })
          .strict(),
      )
      .max(500)
      .optional(),
    limitations: z.array(z.string().min(1).max(512)).max(50).optional(),
  })
  .strict();

async function jsonBody(context: Context<AppEnv>): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    throw new LegalError('INVALID_INPUT', 'Invalid JSON body');
  }
}

function matterResource(matter: LegalMatter) {
  return {
    id: matter.id,
    tenantId: matter.tenantId,
    kind: 'matter',
    restricted: false,
    allowSubs: [],
    allowRoles: [],
  };
}

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', async (context, next) => {
    const correlationId = context.req.header('x-correlation-id') ?? `cor_${randomUUID()}`;
    context.set('correlationId', correlationId);
    context.header('x-correlation-id', correlationId);
    await next();
  });

  app.use(
    '/v1/legal/*',
    bodyLimit({
      maxSize: deps.maxBodyBytes ?? 1_000_000,
      onError: (context) =>
        context.json(
          {
            error: {
              code: 'INVALID_INPUT',
              message: 'Request body exceeds the allowed size',
              correlationId: context.get('correlationId') ?? null,
              retryable: false,
              reconciliationRequired: false,
            },
          },
          413,
        ),
    }),
  );

  app.use('/v1/legal/*', async (context, next) => {
    const header = context.req.header('authorization');
    const token = extractBearer(header);
    const principal = await deps.resolvePrincipal(token);
    context.set('principal', principal);
    await next();
  });

  app.get('/health', (context) =>
    context.json({
      service: 'agntia-legal',
      status: 'ok',
      provider: deps.provider.status,
      time: deps.now().toISOString(),
    }),
  );

  app.get('/v1/legal/me', (context) => {
    const principal = context.get('principal');
    return context.json({
      actorId: principal.actorId,
      tenantId: principal.tenantId,
      kind: principal.kind,
      roles: principal.memberships
        .filter((membership) => membership.tenantId === principal.tenantId)
        .flatMap((membership) => membership.roles),
      capabilities: capabilitiesForPrincipal(principal),
    });
  });

  app.post('/v1/legal/matters', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.intake.propose', tenantId: principal.tenantId });
    const body = parseStrict(intakeBodySchema, await jsonBody(context), 'intake');
    const matter = await deps.matters.intake(
      principal.tenantId,
      principal.actorId,
      { ...body, requestingActorId: principal.actorId },
      deps.now(),
    );
    return context.json(matter, 201);
  });

  app.get('/v1/legal/matters/:id', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    return context.json(matter);
  });

  app.post('/v1/legal/matters/:id/transitions', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.matter.transition',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(transitionBodySchema, await jsonBody(context), 'transition');
    const updated = await deps.matters.transition({
      tenantId: principal.tenantId,
      matterId: matter.id,
      to: body.to,
      expectedVersion: body.expectedVersion,
      actorId: principal.actorId,
      now: deps.now(),
      correlationId: context.get('correlationId'),
      context: {
        ...(body.blockers ? { blockers: body.blockers } : {}),
        ...(body.competentReviewRef !== undefined
          ? { competentReviewRef: body.competentReviewRef }
          : {}),
        ...(body.reviewerIsProposer !== undefined
          ? { reviewerIsProposer: body.reviewerIsProposer }
          : {}),
        ...(body.pendingRequiredFacts !== undefined
          ? { pendingRequiredFacts: body.pendingRequiredFacts }
          : {}),
        ...(body.approvalValid !== undefined ? { approvalValid: body.approvalValid } : {}),
      },
    });
    return context.json(updated);
  });

  app.post('/v1/legal/matters/:id/conflicts', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.conflicts.preview',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(conflictBodySchema, await jsonBody(context), 'conflict check');
    const check = await deps.matters.recordConflictCheck(
      principal.tenantId,
      principal.actorId,
      {
        matterId: matter.id,
        partyRefs: body.partyRefs,
        representation: body.representation,
        result: body.result,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      deps.now(),
    );
    return context.json(check, 201);
  });

  app.post('/v1/legal/matters/:id/conflicts/:checkId/review', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.review.record',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(
      conflictReviewBodySchema,
      await jsonBody(context),
      'conflict review',
    );
    const reviewed = await deps.matters.reviewConflict({
      tenantId: principal.tenantId,
      actorId: principal.actorId,
      checkId: context.req.param('checkId'),
      reviewerRef: body.reviewerRef,
      decision: body.decision,
      rationale: body.rationale,
      now: deps.now(),
    });
    return context.json(reviewed);
  });

  app.post('/v1/legal/matters/:id/documents', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.document.stage',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(documentBodySchema, await jsonBody(context), 'document');
    const result = await deps.documents.register(
      principal.tenantId,
      principal.actorId,
      {
        matterId: matter.id,
        title: body.title,
        custodian: body.custodian,
        sourceRef: body.sourceRef,
        storageRef: body.storageRef,
        contentHash: body.contentHash,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        receivedAt: body.receivedAt,
        ...(body.documentId !== undefined ? { documentId: body.documentId } : {}),
      },
      deps.now(),
    );
    return context.json(result, 201);
  });

  app.get('/v1/legal/documents/:id', async (context) => {
    const principal = context.get('principal');
    const document = await deps.documents.getDocument(principal.tenantId, context.req.param('id'));
    const matter = await deps.matters.get(principal.tenantId, document.matterId);
    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    return context.json(document);
  });

  app.get('/v1/legal/documents/:id/history', async (context) => {
    const principal = context.get('principal');
    const document = await deps.documents.getDocument(principal.tenantId, context.req.param('id'));
    const matter = await deps.matters.get(principal.tenantId, document.matterId);
    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    return context.json(await deps.documents.history(principal.tenantId, document.id));
  });

  app.post('/v1/legal/matters/:id/facts', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.facts.propose',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(factBodySchema, await jsonBody(context), 'fact');
    const fact = await deps.facts.assert(
      principal.tenantId,
      principal.actorId,
      {
        matterId: matter.id,
        statement: body.statement,
        status: body.status,
        ...(body.evidenceRefs !== undefined ? { evidenceRefs: body.evidenceRefs } : {}),
        ...(body.contradictoryEvidenceRefs !== undefined
          ? { contradictoryEvidenceRefs: body.contradictoryEvidenceRefs }
          : {}),
        reviewerRef: body.reviewerRef ?? null,
      },
      deps.now(),
    );
    return context.json(fact, 201);
  });

  app.get('/v1/legal/matters/:id/facts', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    return context.json(await deps.facts.list(principal.tenantId, matter.id));
  });

  app.post('/v1/legal/matters/:id/reviews', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.review.record',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const body = parseStrict(reviewBodySchema, await jsonBody(context), 'review');
    const review = await deps.reviews.record(
      principal.tenantId,
      {
        matterId: matter.id,
        reviewerId: principal.actorId,
        proposerActorId: matter.requestingActorId,
        reviewerQualification: body.reviewerQualification,
        scope: body.scope,
        findings: body.findings,
        decision: body.decision,
        signedDecisionRef: body.signedDecisionRef,
      },
      deps.now(),
    );
    return context.json(review, 201);
  });

  app.get('/v1/legal/matters/:id/reviews', async (context) => {
    const principal = context.get('principal');
    const matter = await deps.matters.get(principal.tenantId, context.req.param('id'));
    authorize(principal, {
      capability: 'legal.matter.read',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    return context.json(await deps.reviews.forMatter(principal.tenantId, matter.id));
  });

  app.post('/v1/legal/citations/verify', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.citation.verify', tenantId: principal.tenantId });
    const body = parseStrict(citationBodySchema, await jsonBody(context), 'citation');
    const result = await verifyCitation(body, { ...deps.citation, now: deps.now() });
    return context.json(result);
  });

  app.post('/v1/legal/deadlines/propose', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.deadline.propose', tenantId: principal.tenantId });
    const body = parseStrict(deadlineBodySchema, await jsonBody(context), 'deadline');
    const matter = await deps.matters.get(principal.tenantId, body.matterId);
    authorize(principal, {
      capability: 'legal.deadline.propose',
      tenantId: principal.tenantId,
      resource: matterResource(matter),
    });
    const result = proposeDeadline({
      matterId: matter.id,
      rule: body.rule as DeadlineRule,
      trigger: body.trigger as DeadlineTrigger,
      calendar: body.calendar as HolidayCalendar,
      applicableTerritory: matter.territory,
      asOf: deps.now(),
      reviewRef: body.reviewRef ?? null,
    });
    return context.json(result);
  });

  app.post('/v1/legal/redlines/preview', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.redline.preview', tenantId: principal.tenantId });
    const body = parseStrict(redlineBodySchema, await jsonBody(context), 'redline');
    const redline = createRedline({
      tenantId: principal.tenantId,
      version: 1,
      contractRevisionId: body.contractRevisionId,
      baseHash: body.baseHash,
      expectedVersion: body.expectedVersion,
      currentVersion: body.currentVersion,
      original: body.original,
      editOps: body.editOps,
      now: deps.now(),
    });
    return context.json(redline);
  });

  app.post('/v1/legal/intents', async (context) => {
    const principal = context.get('principal');
    const body = parseStrict(intentBodySchema, await jsonBody(context), 'intent');
    const approval = body.approvalRef ? deps.approvals.get(principal.tenantId, body.approvalRef) : null;
    if (body.approvalRef && !approval) {
      throw new LegalError('NOT_FOUND', 'Approval not found', {
        details: { reason: 'APPROVAL_NOT_FOUND' },
      });
    }
    const input: ExecuteIntentInput = {
      principal,
      capability: body.capability,
      idempotencyKey: body.idempotencyKey,
      payload: body.payload,
      approval,
      operation: body.operation,
      provider: deps.provider,
      purpose: body.purpose,
      revocationVersion: body.revocationVersion,
      now: deps.now(),
      ...(body.dryRun !== undefined ? { dryRun: body.dryRun } : {}),
    };
    const result = await deps.intents.execute(input);
    return context.json(result, 201);
  });

  app.post('/v1/legal/intents/:id/reconcile', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.intent.execute', tenantId: principal.tenantId });
    const intent = await deps.intents.reconcile({
      tenantId: principal.tenantId,
      intentId: context.req.param('id'),
      provider: deps.provider,
      now: deps.now(),
    });
    return context.json(intent);
  });

  app.get('/v1/legal/integrations/:id/capabilities', (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.report.read', tenantId: principal.tenantId });
    const report = deps.capabilities.find(
      (candidate) =>
        candidate.integrationId === context.req.param('id') &&
        candidate.tenantId === principal.tenantId,
    );
    if (!report) {
      throw new LegalError('NOT_FOUND', 'Integration not found', {
        details: { reason: 'INTEGRATION_NOT_FOUND' },
      });
    }
    return context.json({
      integrationId: report.integrationId,
      deployment: report.deployment,
      edition: report.edition,
      version: report.version,
      capabilities: publicCapabilities(report),
    });
  });

  app.post('/v1/legal/reports', async (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.report.read', tenantId: principal.tenantId });
    const body = parseStrict(reportBodySchema, await jsonBody(context), 'report');
    const matter = await deps.matters.get(principal.tenantId, body.matterId);
    const citations = (body.citations ?? []).map((citation) => ({
      citation: citation.citation,
      resolver: 'api-input',
      resolvedAuthorityRef: citation.resolvedAuthorityRef,
      sourceHash: citation.sourceHash,
      jurisdiction: matter.territory,
      applicableDate: matter.applicableDate,
      existence: citation.resolvedAuthorityRef !== null,
      fragment: null,
      inForce: citation.status === 'verified' ? true : null,
      pertinence: (citation.status === 'verified' ? 'applicable' : 'unknown') as
        | 'applicable'
        | 'not_applicable'
        | 'unknown',
      status: citation.status,
      reasons: citation.reasons,
      verifiedAt: deps.now().toISOString(),
    }));
    const report = buildLegalReport({
      tenantId: principal.tenantId,
      matter,
      facts: body.facts ?? [],
      citations,
      limitations: body.limitations ?? [],
      now: deps.now(),
    });
    deps.reports.save(report);
    return context.json(report, 201);
  });

  app.get('/v1/legal/reports/:id', (context) => {
    const principal = context.get('principal');
    authorize(principal, { capability: 'legal.report.read', tenantId: principal.tenantId });
    const report = deps.reports.get(principal.tenantId, context.req.param('id'));
    if (!report) {
      throw new LegalError('NOT_FOUND', 'Report not found', {
        details: { reason: 'REPORT_NOT_FOUND' },
      });
    }
    return context.json(report);
  });

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          correlationId: context.get('correlationId') ?? null,
          retryable: false,
          reconciliationRequired: false,
        },
      },
      404,
    ),
  );

  app.onError((error, context) => {
    const legalError = toLegalError(error);
    if (legalError.code === 'INTERNAL') {
      // Sanitized diagnostic only: no payload, token or client content.
      console.error('[agntia-legal] internal error', {
        correlationId: context.get('correlationId') ?? null,
        name: (error as Error)?.name ?? 'unknown',
      });
    }
    return context.json(
      {
        error: {
          code: legalError.code,
          message: legalError.message,
          correlationId: context.get('correlationId') ?? null,
          retryable: legalError.retryable,
          reconciliationRequired: legalError.reconciliationRequired,
          ...(legalError.code === 'INTERNAL' ? {} : { details: legalError.details }),
        },
      },
      legalError.httpStatus as ContentfulStatusCode,
    );
  });

  return app;
}
