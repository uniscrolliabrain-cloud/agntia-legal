import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import {
  documentVersionSchema,
  legalDocumentSchema,
  type DocumentVersion,
  type LegalDocument,
} from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import { parseStrict } from '../domain/validate.js';
import type { AuditLog } from '../persistence/audit.js';

export interface RegisterDocumentInput {
  matterId: string;
  title: string;
  custodian: string;
  sourceRef: string;
  storageRef: string;
  contentHash: string;
  mimeType: string;
  sizeBytes: number;
  receivedAt: string;
  /** When present, a new revision of that document is registered. */
  documentId?: string;
}

export interface RegisterDocumentResult {
  document: LegalDocument;
  version: DocumentVersion;
  duplicate: boolean;
}

export interface IntegrityResult {
  ok: boolean;
  latest: DocumentVersion;
  reasons: string[];
}

/**
 * Custody invariant: the original and its hash are preserved. Re-registering
 * identical content is idempotent; altered content creates a new revision and
 * never overwrites history.
 */
export class DocumentService {
  constructor(
    private readonly documents: Repository<LegalDocument>,
    private readonly versions: Repository<DocumentVersion>,
    private readonly audit: AuditLog,
  ) {}

  async register(
    tenantId: string,
    actorId: string,
    input: RegisterDocumentInput,
    now: Date,
  ): Promise<RegisterDocumentResult> {
    const timestamp = now.toISOString();

    if (input.documentId) {
      const document = await this.getDocument(tenantId, input.documentId);
      const versions = await this.history(tenantId, document.id);
      const latest = versions[versions.length - 1];
      if (!latest) {
        throw new LegalError('NOT_FOUND', 'Document has no versions', {
          details: { reason: 'DOCUMENT_WITHOUT_VERSIONS' },
        });
      }

      if (latest.originalHash === input.contentHash) {
        return { document, version: latest, duplicate: true };
      }

      const version = await this.versions.create(
        this.buildVersion(tenantId, document.id, latest.revision + 1, input, timestamp, latest.id),
      );
      const updated = await this.documents.update(
        parseStrict(
          legalDocumentSchema,
          {
            ...document,
            currentVersion: version.revision,
            version: document.version + 1,
            updatedAt: timestamp,
          },
          'document',
        ),
        document.version,
      );
      this.audit.record({
        tenantId,
        actorId,
        action: 'legal.document.revised',
        resourceId: document.id,
        occurredAt: timestamp,
        outcome: 'allowed',
        details: { revision: version.revision, supersedes: latest.id },
      });
      return { document: updated, version, duplicate: false };
    }

    const document = await this.documents.create(
      parseStrict(
        legalDocumentSchema,
        {
          id: `doc_${randomUUID()}`,
          tenantId,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
          matterId: input.matterId,
          title: input.title,
          custodian: input.custodian,
          currentVersion: 1,
        },
        'document',
      ),
    );
    const version = await this.versions.create(
      this.buildVersion(tenantId, document.id, 1, input, timestamp, null),
    );
    this.audit.record({
      tenantId,
      actorId,
      action: 'legal.document.stage',
      resourceId: document.id,
      occurredAt: timestamp,
      outcome: 'allowed',
      details: { revision: 1, custodian: input.custodian },
    });
    return { document, version, duplicate: false };
  }

  async getDocument(tenantId: string, documentId: string): Promise<LegalDocument> {
    const document = await this.documents.get(tenantId, documentId);
    if (!document) {
      throw new LegalError('NOT_FOUND', 'Document not found', {
        details: { reason: 'DOCUMENT_NOT_FOUND' },
      });
    }
    return document;
  }

  async history(tenantId: string, documentId: string): Promise<DocumentVersion[]> {
    const versions = await this.versions.list(tenantId);
    return versions
      .filter((version) => version.documentId === documentId)
      .sort((left, right) => left.revision - right.revision);
  }

  /**
   * Compares the current bytes against the recorded hash of the latest
   * revision. A mismatch is reported, never repaired by overwriting.
   */
  async verifyIntegrity(
    tenantId: string,
    documentId: string,
    actualHash: string,
  ): Promise<IntegrityResult> {
    await this.getDocument(tenantId, documentId);
    const versions = await this.history(tenantId, documentId);
    const latest = versions[versions.length - 1];
    if (!latest) {
      throw new LegalError('NOT_FOUND', 'Document has no versions', {
        details: { reason: 'DOCUMENT_WITHOUT_VERSIONS' },
      });
    }
    const ok = latest.originalHash === actualHash;
    return { ok, latest, reasons: ok ? [] : ['CONTENT_HASH_MISMATCH'] };
  }

  private buildVersion(
    tenantId: string,
    documentId: string,
    revision: number,
    input: RegisterDocumentInput,
    timestamp: string,
    supersedes: string | null,
  ): DocumentVersion {
    return parseStrict(
      documentVersionSchema,
      {
        id: `dver_${randomUUID()}`,
        tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        documentId,
        revision,
        originalHash: input.contentHash,
        custodian: input.custodian,
        sourceRef: input.sourceRef,
        receivedAt: input.receivedAt,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageRef: input.storageRef,
        supersedes,
        extractionStatus: 'pending',
      },
      'document version',
    );
  }
}
