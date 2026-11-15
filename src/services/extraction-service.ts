import { randomUUID } from 'node:crypto';
import type { OcrProvider, OcrRequest } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import { sha256HexSchema } from '../domain/ids.js';

export const ALLOWED_EXTRACTION_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
] as const;

export const MAX_EXTRACTION_BYTES = 20_000_000;

export interface ExtractionResult {
  extractionRef: string;
  status: 'needs_review';
  providerRef: string;
  sourceHash: string;
  pages: { page: number; text: string }[];
  confidence: number;
  reasons: string[];
}

/**
 * Extraction produces a proposal for human review. The provider must confirm
 * the hash it processed; a mismatch is an invalid upstream response, never a
 * silent overwrite. OCR output is data, not an instruction or a fact.
 */
export class ExtractionService {
  constructor(private readonly ocr: OcrProvider) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.ocr.status;
  }

  async extract(request: OcrRequest, _now: Date): Promise<ExtractionResult> {
    if (!(ALLOWED_EXTRACTION_MIME as readonly string[]).includes(request.mimeType)) {
      throw new LegalError('NOT_SUPPORTED', 'Unsupported document type for extraction', {
        details: { reason: 'UNSUPPORTED_MIME', mimeType: request.mimeType },
      });
    }
    if (request.sizeBytes <= 0 || request.sizeBytes > MAX_EXTRACTION_BYTES) {
      throw new LegalError('INVALID_INPUT', 'Document size is outside the allowed range', {
        details: { reason: 'SIZE_OUT_OF_RANGE', maxBytes: MAX_EXTRACTION_BYTES },
      });
    }
    if (!sha256HexSchema.safeParse(request.contentHash).success) {
      throw new LegalError('INVALID_INPUT', 'Extraction requires the original content hash');
    }
    if (request.storageRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Extraction requires a storage reference');
    }

    const result = await this.ocr.extract(request);

    if (result.sourceHash !== request.contentHash) {
      throw new LegalError('UPSTREAM_INVALID', 'Provider processed a different source', {
        details: { reason: 'SOURCE_HASH_MISMATCH' },
      });
    }
    if (!result.verified) {
      throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Extraction is not verified', {
        details: { reason: 'OCR_NOT_VERIFIED', provider: result.providerRef },
      });
    }

    const reasons = ['HUMAN_REVIEW_REQUIRED'];
    if (result.confidence < 0.6) reasons.push('LOW_CONFIDENCE');

    return {
      extractionRef: `ext_${randomUUID()}`,
      status: 'needs_review',
      providerRef: result.providerRef,
      sourceHash: result.sourceHash,
      pages: result.pages.map((page) => ({ page: page.page, text: page.text })),
      confidence: result.confidence,
      reasons,
    };
  }
}
