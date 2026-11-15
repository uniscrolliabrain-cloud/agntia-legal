import { LegalError } from '../domain/errors.js';

export interface ProviderRef {
  id: string;
  status: 'configured' | 'not_configured';
}

function notConfigured(id: string): never {
  throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Provider is not configured', {
    details: { reason: 'PROVIDER_NOT_CONFIGURED', provider: id },
  });
}

export interface OcrPage {
  page: number;
  text: string;
}

export interface OcrResult {
  providerRef: string;
  sourceHash: string;
  pages: OcrPage[];
  confidence: number;
  verified: boolean;
}

export interface OcrRequest {
  tenantId: string;
  documentVersionId: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageRef: string;
}

export interface OcrProvider extends ProviderRef {
  extract(request: OcrRequest): Promise<OcrResult>;
}

export class NotConfiguredOcrProvider implements OcrProvider {
  readonly id = 'ocr.not_configured';
  readonly status = 'not_configured' as const;

  async extract(): Promise<OcrResult> {
    return notConfigured(this.id);
  }
}

/** Test-only provider: produces deterministic pages, never used in production. */
export class ScriptedOcrProvider implements OcrProvider {
  readonly id = 'ocr.scripted';
  readonly status = 'configured' as const;

  constructor(private readonly result: OcrResult) {}

  async extract(): Promise<OcrResult> {
    return { ...this.result, pages: this.result.pages.map((page) => ({ ...page })) };
  }
}

export interface ContractRevisionImport {
  providerRef: string;
  revisionRef: string;
  contentHash: string;
  paragraphs: { id: string; text: string }[];
}

export interface OpenContractsProvider extends ProviderRef {
  importRevision(request: {
    tenantId: string;
    externalId: string;
    contentHash: string;
  }): Promise<ContractRevisionImport>;
}

export class NotConfiguredOpenContractsProvider implements OpenContractsProvider {
  readonly id = 'opencontracts.not_configured';
  readonly status = 'not_configured' as const;

  async importRevision(): Promise<ContractRevisionImport> {
    return notConfigured(this.id);
  }
}

export interface InterviewSession {
  providerRef: string;
  sessionRef: string;
  templateRef: string;
}

export interface DocassembleProvider extends ProviderRef {
  startInterview(request: { tenantId: string; templateRef: string }): Promise<InterviewSession>;
}

export class NotConfiguredDocassembleProvider implements DocassembleProvider {
  readonly id = 'docassemble.not_configured';
  readonly status = 'not_configured' as const;

  async startInterview(): Promise<InterviewSession> {
    return notConfigured(this.id);
  }
}

export interface PresenceSession {
  providerRef: string;
  sessionRef: string;
  /** Opaque reference, never a token or credential. */
  tokenRef: string;
  expiresAt: string;
}

export interface AnamProvider extends ProviderRef {
  createSession(request: {
    tenantId: string;
    threadId: string;
    subjectRef: string;
  }): Promise<PresenceSession>;
}

export class NotConfiguredAnamProvider implements AnamProvider {
  readonly id = 'anam.not_configured';
  readonly status = 'not_configured' as const;

  async createSession(): Promise<PresenceSession> {
    return notConfigured(this.id);
  }
}

export interface SignatureResult {
  signatureRef: string;
  signedAt: string;
  verified: boolean;
}

export interface SignatureProvider extends ProviderRef {
  sign(request: {
    tenantId: string;
    documentHash: string;
    signerRef: string;
    purpose: string;
  }): Promise<SignatureResult>;
}

export class NotConfiguredSignatureProvider implements SignatureProvider {
  readonly id = 'signature.not_configured';
  readonly status = 'not_configured' as const;

  async sign(): Promise<SignatureResult> {
    return notConfigured(this.id);
  }
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelResult {
  providerRef: string;
  outputRef: string;
  outputHash: string;
  cost: { amount: string; currency: string; exponent: number };
  usage: ModelUsage;
}

export interface ModelRequest {
  tenantId: string;
  model: string;
  purpose: string;
  /** The prompt is stored by reference; the gateway never logs its content. */
  promptRef: string;
  promptHash: string;
  maxOutputTokens: number;
  estimatedCost: { amount: string; currency: string; exponent: number };
}

export interface ModelGateway extends ProviderRef {
  complete(request: ModelRequest): Promise<ModelResult>;
}

export class NotConfiguredModelGateway implements ModelGateway {
  readonly id = 'model.not_configured';
  readonly status = 'not_configured' as const;

  async complete(): Promise<ModelResult> {
    return notConfigured(this.id);
  }
}

export interface SourceSnapshot {
  providerRef: string;
  sourceHash: string;
  retrievedAt: string;
  contentRef: string;
}

export interface SourceSnapshotProvider extends ProviderRef {
  fetch(request: {
    tenantId: string;
    officialRef: string;
    sourceUrl: string;
    jurisdiction: string;
  }): Promise<SourceSnapshot>;
}

export class NotConfiguredSourceSnapshotProvider implements SourceSnapshotProvider {
  readonly id = 'sources.not_configured';
  readonly status = 'not_configured' as const;

  async fetch(): Promise<SourceSnapshot> {
    return notConfigured(this.id);
  }
}

export interface SourceChange {
  changed: boolean;
  newHash: string;
  summaryRef: string | null;
}

export interface SourceWatchProvider extends ProviderRef {
  diff(request: {
    tenantId: string;
    sourceRef: string;
    previousHash: string;
  }): Promise<SourceChange>;
}

export class NotConfiguredSourceWatchProvider implements SourceWatchProvider {
  readonly id = 'watch.not_configured';
  readonly status = 'not_configured' as const;

  async diff(): Promise<SourceChange> {
    return notConfigured(this.id);
  }
}
