import { z } from 'zod';
import { evidenceRefSchema } from './evidence.js';
import {
  isoDateSchema,
  isoDateTimeSchema,
  moneySchema,
  opaqueIdSchema,
  sha256HexSchema,
} from './ids.js';
import { DOMAIN_STATES } from './states.js';

const entityBase = {
  id: opaqueIdSchema,
  tenantId: opaqueIdSchema,
  version: z.number().int().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
};

const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

export const engagementScopeSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  purpose: z.string().min(1).max(512),
  territories: z.array(z.string().min(2).max(16)).min(1),
  applicableDate: isoDateSchema,
  requestedAction: z.string().min(1).max(512),
  exclusions: z.array(z.string().min(1).max(512)).default([]),
  status: z.enum(['draft', 'pending_confirmation', 'confirmed', 'revoked']),
});

export type EngagementScope = z.infer<typeof engagementScopeSchema>;

export const legalMatterSchema = strict({
  ...entityBase,
  requestingActorId: opaqueIdSchema,
  title: z.string().min(1).max(256),
  purpose: z.string().min(1).max(512),
  territory: z.string().min(2).max(16),
  applicableDate: isoDateSchema,
  requestedAction: z.string().min(1).max(512),
  state: z.enum(DOMAIN_STATES),
  scopeRef: opaqueIdSchema.nullable().default(null),
  conflictCheckRef: opaqueIdSchema.nullable().default(null),
  reviewerRef: opaqueIdSchema.nullable().default(null),
  approvalRef: opaqueIdSchema.nullable().default(null),
  blockers: z.array(z.string().min(1).max(256)).default([]),
});

export type LegalMatter = z.infer<typeof legalMatterSchema>;

export const conflictCheckSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  partyRefs: z.array(z.string().min(1).max(256)).min(1),
  representation: z.string().min(1).max(512),
  result: z.enum(['clear', 'possible_conflict', 'conflict', 'insufficient_data']),
  requestedBy: opaqueIdSchema.nullable().default(null),
  reviewerRef: opaqueIdSchema.nullable().default(null),
  notes: z.string().max(2000).default(''),
});

export type ConflictCheck = z.infer<typeof conflictCheckSchema>;

export const legalDocumentSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  title: z.string().min(1).max(256),
  custodian: z.string().min(1).max(256),
  currentVersion: z.number().int().min(1),
});

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export const documentVersionSchema = strict({
  ...entityBase,
  documentId: opaqueIdSchema,
  revision: z.number().int().min(1),
  originalHash: sha256HexSchema,
  custodian: z.string().min(1).max(256),
  sourceRef: z.string().min(1).max(512),
  receivedAt: isoDateTimeSchema,
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.number().int().min(0),
  storageRef: z.string().min(1).max(512),
  supersedes: opaqueIdSchema.nullable().default(null),
  extractionStatus: z.enum(['pending', 'extracted', 'needs_review', 'failed']),
});

export type DocumentVersion = z.infer<typeof documentVersionSchema>;

export const factAssertionSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  statement: z.string().min(1).max(4000),
  status: z.enum(['asserted', 'corroborated', 'contradicted', 'unverified']),
  evidenceRefs: z.array(evidenceRefSchema).default([]),
  contradictoryEvidenceRefs: z.array(evidenceRefSchema).default([]),
  reviewerRef: opaqueIdSchema.nullable().default(null),
});

export type FactAssertion = z.infer<typeof factAssertionSchema>;

export const jurisdictionSchema = strict({
  territory: z.string().min(2).max(16),
  applicableDate: isoDateSchema,
  competence: z.enum(['confirmed', 'pending', 'disputed']),
  notes: z.string().max(2000).default(''),
});

export type Jurisdiction = z.infer<typeof jurisdictionSchema>;

export const lawSnapshotSchema = strict({
  ...entityBase,
  lawId: opaqueIdSchema,
  officialRef: z.string().min(1).max(512),
  jurisdiction: z.string().min(2).max(16),
  versionDate: isoDateSchema,
  consolidationStatus: z.enum(['consolidated', 'pending', 'unknown']),
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.nullable().default(null),
  sourceHash: sha256HexSchema,
  retrievedAt: isoDateTimeSchema,
  sourceUrl: z.string().url().max(2048),
});

export type LawSnapshot = z.infer<typeof lawSnapshotSchema>;

export const CITATION_STATUSES = [
  'verified',
  'needs_review',
  'unsupported',
  'not_found',
  'invalid',
] as const;

export type CitationStatus = (typeof CITATION_STATUSES)[number];

export const citationVerificationSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema.nullable().default(null),
  citation: z.string().min(1).max(512),
  resolver: z.string().min(1).max(128),
  resolvedAuthorityRef: z.string().min(1).max(512).nullable(),
  sourceHash: sha256HexSchema.nullable(),
  jurisdiction: z.string().min(2).max(16),
  applicableDate: isoDateSchema,
  existence: z.boolean(),
  fragment: z.string().min(1).max(4000).nullable(),
  inForce: z.boolean().nullable(),
  pertinence: z.enum(['applicable', 'not_applicable', 'unknown']),
  status: z.enum(CITATION_STATUSES),
  reasons: z.array(z.string().min(1).max(256)).default([]),
  verifiedAt: isoDateTimeSchema,
});

export type CitationVerification = z.infer<typeof citationVerificationSchema>;

export const legalIssueSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  question: z.string().min(1).max(2000),
  jurisdiction: z.string().min(2).max(16),
  status: z.enum(['open', 'researching', 'answered', 'needs_review']),
});

export type LegalIssue = z.infer<typeof legalIssueSchema>;

export const clausePlaybookSchema = strict({
  ...entityBase,
  clauseType: z.string().min(1).max(128),
  jurisdiction: z.string().min(2).max(16),
  approvedOptions: z.array(z.string().min(1).max(4000)).min(1),
  reviewRef: opaqueIdSchema,
});

export type ClausePlaybook = z.infer<typeof clausePlaybookSchema>;

export const contractRevisionSchema = strict({
  ...entityBase,
  contractId: opaqueIdSchema,
  revision: z.number().int().min(1),
  baseHash: sha256HexSchema,
  contentHash: sha256HexSchema,
  sourceRef: z.string().min(1).max(512),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
});

export type ContractRevision = z.infer<typeof contractRevisionSchema>;

export const editOpSchema = z
  .object({
    op: z.enum(['replace', 'insert', 'delete']),
    paragraphId: opaqueIdSchema,
    expectedTextHash: sha256HexSchema.nullable().default(null),
    text: z.string().max(20000).nullable().default(null),
  })
  .strict();

export type EditOp = z.infer<typeof editOpSchema>;

export const redlineSchema = strict({
  ...entityBase,
  contractRevisionId: opaqueIdSchema,
  baseHash: sha256HexSchema,
  editOps: z.array(editOpSchema).min(1),
  semanticDiff: z
    .object({
      added: z.array(z.string()),
      removed: z.array(z.string()),
      modified: z.array(z.object({ paragraphId: z.string(), before: z.string(), after: z.string() }).strict()),
      unchanged: z.array(z.string()),
    })
    .strict(),
  expectedVersion: z.number().int().min(1),
  redlineHash: sha256HexSchema,
});

export type Redline = z.infer<typeof redlineSchema>;

export const obligationSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  obligationSource: z.string().min(1).max(512),
  trigger: z.string().min(1).max(512),
  owner: z.string().min(1).max(256),
  reviewAt: isoDateSchema,
  status: z.enum(['proposed', 'active', 'expired', 'waived']),
  signedInstrumentRef: opaqueIdSchema.nullable().default(null),
});

export type Obligation = z.infer<typeof obligationSchema>;

export const deadlineProposalSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  triggerRef: opaqueIdSchema,
  ruleId: opaqueIdSchema,
  ruleVersion: z.number().int().min(1),
  territory: z.string().min(2).max(16),
  dueDate: isoDateSchema.nullable(),
  computedFrom: isoDateSchema.nullable(),
  requiresReview: z.boolean(),
  status: z.enum(['blocked', 'proposed', 'ready_for_approval']),
  reasons: z.array(z.string().min(1).max(256)).default([]),
});

export type DeadlineProposal = z.infer<typeof deadlineProposalSchema>;

export const reviewOpinionSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  reviewerId: opaqueIdSchema,
  reviewerQualification: z.string().min(1).max(256),
  scope: z.string().min(1).max(512),
  findings: z.array(z.string().min(1).max(2000)).min(1),
  decision: z.enum(['approved', 'rejected', 'needs_changes']),
  signedDecisionRef: opaqueIdSchema,
});

export type ReviewOpinion = z.infer<typeof reviewOpinionSchema>;

export const filingProposalSchema = strict({
  ...entityBase,
  matterId: opaqueIdSchema,
  actType: z.string().min(1).max(128),
  representationProof: opaqueIdSchema.nullable().default(null),
  approvalRef: opaqueIdSchema.nullable().default(null),
  payloadHash: sha256HexSchema,
  status: z.enum(['proposed', 'blocked', 'authorized', 'filed', 'rejected']),
});

export type FilingProposal = z.infer<typeof filingProposalSchema>;

export const retentionHoldSchema = strict({
  ...entityBase,
  retentionRule: z.string().min(1).max(256),
  holdScope: z.string().min(1).max(512),
  requesterProof: opaqueIdSchema,
  requestedBy: opaqueIdSchema.nullable().default(null),
  exportAcl: z.array(z.string().min(1).max(128)).default([]),
  expiresAt: isoDateTimeSchema.nullable().default(null),
  status: z.enum(['active', 'released', 'expired']),
});

export type RetentionHold = z.infer<typeof retentionHoldSchema>;

export const budgetReservationSchema = strict({
  ...entityBase,
  operationKey: opaqueIdSchema,
  amount: moneySchema,
  status: z.enum(['reserved', 'consumed', 'released', 'expired']),
  consumedAmount: moneySchema.nullable().default(null),
});

export type BudgetReservation = z.infer<typeof budgetReservationSchema>;
