import { createApp } from './api/app.js';
import { unconfiguredResolver, type PrincipalResolver } from './api/auth.js';
import type { CapabilityReport } from './adapters/capability.js';
import { NotConfiguredProvider } from './adapters/provider.js';
import { InMemoryCitationResolver, InMemoryLawSnapshots } from './adapters/sources.js';
import type { CitationResolver, LawSnapshotLookup } from './core/citation.js';
import { IntentService } from './core/intents.js';
import type { EffectProvider } from './core/ports.js';
import type {
  BudgetReservation,
  ConflictCheck,
  DocumentVersion,
  FactAssertion,
  LegalDocument,
  LegalMatter,
  RetentionHold,
  ReviewOpinion,
} from './domain/entities.js';
import { AuditLog } from './persistence/audit.js';
import { InMemoryIntentRepository, InMemoryRepository } from './persistence/memory.js';
import { MatterAccessService } from './services/access-service.js';
import { ApprovalStore } from './services/approvals.js';
import { BudgetService } from './services/budget-service.js';
import { DocumentService } from './services/document-service.js';
import { FactService } from './services/fact-service.js';
import { MatterService } from './services/matter-service.js';
import { ReportStore } from './services/report-store.js';
import { RetentionService } from './services/retention-service.js';
import { ReviewService } from './services/review-service.js';

export interface RuntimeOptions {
  resolvePrincipal?: PrincipalResolver;
  provider?: EffectProvider;
  citation?: { resolver: CitationResolver; snapshots: LawSnapshotLookup };
  capabilities?: CapabilityReport[];
  now?: () => Date;
  maxBodyBytes?: number;
}

export interface LegalRuntime {
  app: ReturnType<typeof createApp>;
  services: {
    matters: MatterService;
    intents: IntentService;
    documents: DocumentService;
    facts: FactService;
    reviews: ReviewService;
    retention: RetentionService;
    budget: BudgetService;
    access: MatterAccessService;
  };
  repos: {
    matters: InMemoryRepository<LegalMatter>;
    conflicts: InMemoryRepository<ConflictCheck>;
    intents: InMemoryIntentRepository;
    documents: InMemoryRepository<LegalDocument>;
    documentVersions: InMemoryRepository<DocumentVersion>;
    facts: InMemoryRepository<FactAssertion>;
    reviews: InMemoryRepository<ReviewOpinion>;
    holds: InMemoryRepository<RetentionHold>;
    budgets: InMemoryRepository<BudgetReservation>;
  };
  approvalStore: ApprovalStore;
  reportStore: ReportStore;
  audit: AuditLog;
  provider: EffectProvider;
  citation: { resolver: CitationResolver; snapshots: LawSnapshotLookup };
  now: () => Date;
}

/**
 * Composition root. In-memory repositories are the reference implementation for
 * local runs and tests; the SQL schema under db/migrations is the production
 * target and is NOT_VERIFIED until executed against Postgres.
 */
export function createRuntime(options: RuntimeOptions = {}): LegalRuntime {
  const matters = new InMemoryRepository<LegalMatter>();
  const conflicts = new InMemoryRepository<ConflictCheck>();
  const intentsRepo = new InMemoryIntentRepository();
  const audit = new AuditLog();
  const approvalStore = new ApprovalStore();
  const reportStore = new ReportStore();
  const documentsRepo = new InMemoryRepository<LegalDocument>();
  const documentVersionsRepo = new InMemoryRepository<DocumentVersion>();
  const factsRepo = new InMemoryRepository<FactAssertion>();
  const reviewsRepo = new InMemoryRepository<ReviewOpinion>();
  const holdsRepo = new InMemoryRepository<RetentionHold>();
  const budgetsRepo = new InMemoryRepository<BudgetReservation>();

  const matterService = new MatterService(matters, conflicts, audit);
  const intentService = new IntentService(intentsRepo);
  const documentService = new DocumentService(documentsRepo, documentVersionsRepo, audit);
  const factService = new FactService(factsRepo);
  const reviewService = new ReviewService(reviewsRepo);
  const retentionService = new RetentionService(holdsRepo);
  const budgetService = new BudgetService(budgetsRepo);
  const accessService = new MatterAccessService();
  const provider = options.provider ?? new NotConfiguredProvider();
  const citation = options.citation ?? {
    resolver: new InMemoryCitationResolver(),
    snapshots: new InMemoryLawSnapshots(),
  };
  const now = options.now ?? (() => new Date());

  const app = createApp({
    resolvePrincipal: options.resolvePrincipal ?? unconfiguredResolver,
    matters: matterService,
    intents: intentService,
    documents: documentService,
    facts: factService,
    reviews: reviewService,
    approvals: approvalStore,
    reports: reportStore,
    citation,
    provider,
    capabilities: options.capabilities ?? [],
    now,
    ...(options.maxBodyBytes !== undefined ? { maxBodyBytes: options.maxBodyBytes } : {}),
  });

  return {
    app,
    services: {
      matters: matterService,
      intents: intentService,
      documents: documentService,
      facts: factService,
      reviews: reviewService,
      retention: retentionService,
      budget: budgetService,
      access: accessService,
    },
    repos: {
      matters,
      conflicts,
      intents: intentsRepo,
      documents: documentsRepo,
      documentVersions: documentVersionsRepo,
      facts: factsRepo,
      reviews: reviewsRepo,
      holds: holdsRepo,
      budgets: budgetsRepo,
    },
    approvalStore,
    reportStore,
    audit,
    provider,
    citation,
    now,
  };
}
