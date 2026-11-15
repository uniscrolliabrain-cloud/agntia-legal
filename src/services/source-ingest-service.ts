import type { SourceSnapshotProvider } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import { sha256HexSchema } from '../domain/ids.js';

export const DEFAULT_SOURCE_HOSTS = ['boe.es', 'www.boe.es', 'eur-lex.europa.eu'] as const;

export interface IngestRequest {
  tenantId: string;
  officialRef: string;
  sourceUrl: string;
  jurisdiction: string;
  expectedHash?: string | null;
}

export interface IngestedSnapshot {
  status: 'needs_review';
  providerRef: string;
  sourceHash: string;
  retrievedAt: string;
  contentRef: string;
  reasons: string[];
}

/**
 * Official sources are read through an allowlisted HTTPS host. The snapshot is
 * a versioned source reference: it does not establish force, applicability or a
 * conclusion, so it stays `needs_review`.
 */
export class SourceIngestService {
  constructor(
    private readonly provider: SourceSnapshotProvider,
    private readonly allowedHosts: readonly string[] = DEFAULT_SOURCE_HOSTS,
  ) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.provider.status;
  }

  async ingest(request: IngestRequest): Promise<IngestedSnapshot> {
    if (request.officialRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'An official reference is required');
    }

    let url: URL;
    try {
      url = new URL(request.sourceUrl);
    } catch {
      throw new LegalError('INVALID_INPUT', 'Invalid source URL', {
        details: { reason: 'INVALID_SOURCE_URL' },
      });
    }
    if (url.protocol !== 'https:') {
      throw new LegalError('INVALID_INPUT', 'Official sources must use HTTPS', {
        details: { reason: 'INSECURE_SOURCE_URL' },
      });
    }
    if (url.username || url.password) {
      throw new LegalError('INVALID_INPUT', 'Source URL must not embed credentials', {
        details: { reason: 'CREDENTIALS_IN_URL' },
      });
    }
    if (!this.allowedHosts.includes(url.hostname)) {
      throw new LegalError('FORBIDDEN', 'Source host is not allowlisted', {
        details: { reason: 'SOURCE_HOST_NOT_ALLOWED', host: url.hostname },
      });
    }

    const snapshot = await this.provider.fetch({
      tenantId: request.tenantId,
      officialRef: request.officialRef,
      sourceUrl: url.toString(),
      jurisdiction: request.jurisdiction,
    });

    if (!sha256HexSchema.safeParse(snapshot.sourceHash).success) {
      throw new LegalError('UPSTREAM_INVALID', 'Provider returned an invalid source hash', {
        details: { reason: 'INVALID_SOURCE_HASH' },
      });
    }
    if (request.expectedHash && request.expectedHash !== snapshot.sourceHash) {
      throw new LegalError('UPSTREAM_INVALID', 'Source hash does not match expectation', {
        details: { reason: 'SOURCE_HASH_MISMATCH' },
      });
    }

    return {
      status: 'needs_review',
      providerRef: snapshot.providerRef,
      sourceHash: snapshot.sourceHash,
      retrievedAt: snapshot.retrievedAt,
      contentRef: snapshot.contentRef,
      reasons: ['CONSOLIDATION_UNKNOWN', 'HUMAN_REVIEW_REQUIRED'],
    };
  }
}
