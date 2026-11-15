import type { OpenContractsProvider } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import { sha256HexSchema } from '../domain/ids.js';

export interface ImportRevisionRequest {
  tenantId: string;
  externalId: string;
  contentHash: string;
}

export interface ImportedRevision {
  status: 'needs_review';
  providerRef: string;
  revisionRef: string;
  contentHash: string;
  paragraphs: { id: string; text: string }[];
  reasons: string[];
}

const MAX_PARAGRAPHS = 5000;
const MAX_PARAGRAPH_CHARS = 20_000;

/**
 * External contract tooling is an import source, not an authority. The returned
 * hash must match the requested content, identifiers must be unique and the
 * revision is always `needs_review`.
 */
export class ContractToolingService {
  constructor(private readonly provider: OpenContractsProvider) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.provider.status;
  }

  async importRevision(request: ImportRevisionRequest): Promise<ImportedRevision> {
    if (request.externalId.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'An external revision id is required');
    }
    if (!sha256HexSchema.safeParse(request.contentHash).success) {
      throw new LegalError('INVALID_INPUT', 'A sha256 content hash is required');
    }

    const imported = await this.provider.importRevision(request);
    const paragraphs = imported.paragraphs ?? [];
    if (paragraphs.length === 0 || paragraphs.length > MAX_PARAGRAPHS) {
      throw new LegalError('UPSTREAM_INVALID', 'Provider returned an invalid paragraph set', {
        details: { reason: 'PARAGRAPH_COUNT_OUT_OF_RANGE' },
      });
    }

    const seen = new Set<string>();
    for (const paragraph of paragraphs) {
      if (paragraph.id.trim().length === 0 || paragraph.text.length > MAX_PARAGRAPH_CHARS) {
        throw new LegalError('UPSTREAM_INVALID', 'Provider returned an invalid paragraph', {
          details: { reason: 'PARAGRAPH_INVALID' },
        });
      }
      if (seen.has(paragraph.id)) {
        throw new LegalError('UPSTREAM_INVALID', 'Provider returned duplicate paragraph ids', {
          details: { reason: 'DUPLICATE_PARAGRAPH_ID' },
        });
      }
      seen.add(paragraph.id);
    }

    if (imported.contentHash !== request.contentHash) {
      throw new LegalError('UPSTREAM_INVALID', 'Imported revision hash does not match', {
        details: { reason: 'CONTENT_HASH_MISMATCH' },
      });
    }

    return {
      status: 'needs_review',
      providerRef: imported.providerRef,
      revisionRef: imported.revisionRef,
      contentHash: imported.contentHash,
      paragraphs: paragraphs.map((paragraph) => ({ ...paragraph })),
      reasons: ['HUMAN_REVIEW_REQUIRED', 'EXTERNAL_SOURCE_UNVERIFIED'],
    };
  }
}
