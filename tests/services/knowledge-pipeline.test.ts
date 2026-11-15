import { describe, expect, it } from 'vitest';
import {
  NotConfiguredDocassembleProvider,
  NotConfiguredOcrProvider,
  NotConfiguredOpenContractsProvider,
  NotConfiguredSourceSnapshotProvider,
  NotConfiguredSourceWatchProvider,
  ScriptedOcrProvider,
  type OcrResult,
  type OpenContractsProvider,
  type SourceSnapshotProvider,
  type SourceWatchProvider,
} from '../../src/adapters/external.js';
import { sha256Hex } from '../../src/core/hash.js';
import { LegalError } from '../../src/domain/errors.js';
import { ContractToolingService } from '../../src/services/contract-tooling-service.js';
import { ExtractionService } from '../../src/services/extraction-service.js';
import { InterviewService, type InterviewTemplate } from '../../src/services/interview-service.js';
import { SourceIngestService } from '../../src/services/source-ingest-service.js';
import { WatchService } from '../../src/services/watch-service.js';
import { TENANT_A, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const DOC_HASH = sha256Hex('doc-1');

async function expectReason(
  run: () => Promise<unknown> | unknown,
  code: string,
  reason: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(LegalError);
    const legal = error as LegalError;
    expect(legal.code).toBe(code);
    expect(legal.details).toMatchObject({ reason });
    return;
  }
  throw new Error(`Expected ${code}/${reason}`);
}

const ocrRequest = {
  tenantId: TENANT_A,
  documentVersionId: 'dver_1',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  contentHash: DOC_HASH,
  storageRef: 's3://documents/1.pdf',
};

function ocrResult(overrides: Partial<OcrResult> = {}): OcrResult {
  return {
    providerRef: 'ocr.scripted',
    sourceHash: DOC_HASH,
    pages: [{ page: 1, text: 'Texto extraído' }],
    confidence: 0.92,
    verified: true,
    ...overrides,
  };
}

describe('extracción documental', () => {
  it('propone el texto para revisión sin verificar el documento', async () => {
    const service = new ExtractionService(new ScriptedOcrProvider(ocrResult()));
    const extraction = await service.extract(ocrRequest, NOW);

    expect(extraction.status).toBe('needs_review');
    expect(extraction.pages[0]?.text).toBe('Texto extraído');
    expect(extraction.reasons).toContain('HUMAN_REVIEW_REQUIRED');
  });

  it('marca baja confianza y rechaza hash distinto', async () => {
    const lowConfidence = new ExtractionService(
      new ScriptedOcrProvider(ocrResult({ confidence: 0.4 })),
    );
    expect((await lowConfidence.extract(ocrRequest, NOW)).reasons).toContain('LOW_CONFIDENCE');

    const mismatch = new ExtractionService(
      new ScriptedOcrProvider(ocrResult({ sourceHash: sha256Hex('otro') })),
    );
    await expectReason(() => mismatch.extract(ocrRequest, NOW), 'UPSTREAM_INVALID', 'SOURCE_HASH_MISMATCH');
  });

  it('rechaza MIME no soportado y proveedor sin configurar', async () => {
    const service = new ExtractionService(new ScriptedOcrProvider(ocrResult()));
    await expectReason(
      () => service.extract({ ...ocrRequest, mimeType: 'application/zip' }, NOW),
      'NOT_SUPPORTED',
      'UNSUPPORTED_MIME',
    );

    const notConfigured = new ExtractionService(new NotConfiguredOcrProvider());
    await expectReason(
      () => notConfigured.extract(ocrRequest, NOW),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});

describe('herramientas contractuales externas', () => {
  const provider: OpenContractsProvider = {
    id: 'opencontracts.test',
    status: 'configured',
    async importRevision(request) {
      return {
        providerRef: 'opencontracts.test',
        revisionRef: 'ocr_rev_1',
        contentHash: request.contentHash,
        paragraphs: [{ id: 'p1', text: 'Cláusula primera' }],
      };
    },
  };

  it('importa una revisión y la deja pendiente de revisión', async () => {
    const service = new ContractToolingService(provider);
    const revision = await service.importRevision({
      tenantId: TENANT_A,
      externalId: 'ext_1',
      contentHash: DOC_HASH,
    });

    expect(revision.status).toBe('needs_review');
    expect(revision.contentHash).toBe(DOC_HASH);
    expect(revision.reasons).toContain('EXTERNAL_SOURCE_UNVERIFIED');
  });

  it('rechaza hash distinto y proveedor sin configurar', async () => {
    const wrongHash: OpenContractsProvider = {
      ...provider,
      async importRevision() {
        return { providerRef: 'x', revisionRef: 'r', contentHash: sha256Hex('x'), paragraphs: [{ id: 'p', text: 't' }] };
      },
    };
    await expectReason(
      () =>
        new ContractToolingService(wrongHash).importRevision({
          tenantId: TENANT_A,
          externalId: 'ext_1',
          contentHash: DOC_HASH,
        }),
      'UPSTREAM_INVALID',
      'CONTENT_HASH_MISMATCH',
    );

    await expectReason(
      () =>
        new ContractToolingService(new NotConfiguredOpenContractsProvider()).importRevision({
          tenantId: TENANT_A,
          externalId: 'ext_1',
          contentHash: DOC_HASH,
        }),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});

describe('entrevistas', () => {
  const template: InterviewTemplate = {
    id: 'tpl_1',
    version: 1,
    questions: [
      { id: 'q1', prompt: '¿Quién contrata?', required: true, evidenceRequired: true },
      { id: 'q2', prompt: '¿Importe?', required: false, evidenceRequired: false },
    ],
  };

  it('bloquea respuestas requeridas sin evidencia y no inventa', () => {
    const service = new InterviewService(new NotConfiguredDocassembleProvider());
    const blocked = service.validate(template, {
      q1: { value: 'ACME SL', evidenceRef: null },
    });

    expect(blocked.status).toBe('blocked');
    expect(blocked.missing).toContain('q1');
    expect(blocked.answers.q1).toBeUndefined();

    const proposed = service.validate(template, {
      q1: { value: 'ACME SL', evidenceRef: 'evd_1' },
    });
    expect(proposed.status).toBe('proposed');
    expect(proposed.answers.q1).toBe('ACME SL');
  });

  it('rechaza preguntas desconocidas y sesión sin proveedor', async () => {
    const service = new InterviewService(new NotConfiguredDocassembleProvider());
    expect(() =>
      service.validate(template, { q9: { value: 'x', evidenceRef: 'e' } }),
    ).toThrow(LegalError);

    await expectReason(
      () => service.start(TENANT_A, 'tpl_1'),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});

describe('seguimiento normativo', () => {
  const baseline = sha256Hex('baseline');
  const changed = sha256Hex('changed');

  function watchProvider(): SourceWatchProvider {
    return {
      id: 'watch.test',
      status: 'configured',
      async diff() {
        // At-least-once provider: it keeps reporting the same new hash after a
        // retry, which the service must deduplicate instead of duplicating.
        return { changed: true, newHash: changed, summaryRef: 'sum_1' };
      },
    };
  }

  it('registra un cambio pendiente y lo deduplica', async () => {
    const service = new WatchService(watchProvider());
    const subscription = service.subscribe({
      tenantId: TENANT_A,
      topic: 'BOE',
      sourceRef: 'boe:ley-1',
      baselineHash: baseline,
      cadence: 'daily',
      now: NOW,
    });

    const first = await service.poll(TENANT_A, subscription.id, NOW);
    expect(first?.status).toBe('needs_review');
    expect(first?.newHash).toBe(changed);

    const replay = await service.poll(TENANT_A, subscription.id, NOW);
    expect(replay?.id).toBe(first?.id);
    expect(service.changesFor(TENANT_A)).toHaveLength(1);

    service.pause(TENANT_A, subscription.id);
    expect(await service.poll(TENANT_A, subscription.id, NOW)).toBeNull();
    expect(service.changesFor(TENANT_A)[0]?.previousHash).toBe(baseline);
  });

  it('no expone suscripciones de otro tenant y falla sin proveedor', async () => {
    const service = new WatchService(new NotConfiguredSourceWatchProvider());
    const subscription = service.subscribe({
      tenantId: TENANT_A,
      topic: 'BOE',
      sourceRef: 'boe:ley-1',
      baselineHash: baseline,
      cadence: 'weekly',
      now: NOW,
    });

    await expectReason(
      () => service.poll(TENANT_B, subscription.id, NOW),
      'NOT_FOUND',
      'SUBSCRIPTION_NOT_FOUND',
    );
    await expectReason(
      () => service.poll(TENANT_A, subscription.id, NOW),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});

describe('ingesta de fuentes oficiales', () => {
  const snapshotProvider: SourceSnapshotProvider = {
    id: 'sources.test',
    status: 'configured',
    async fetch() {
      return {
        providerRef: 'sources.test',
        sourceHash: DOC_HASH,
        retrievedAt: NOW.toISOString(),
        contentRef: 'store://boe/1',
      };
    },
  };

  it('acepta un host permitido y deja la consolidación pendiente', async () => {
    const service = new SourceIngestService(snapshotProvider);
    const snapshot = await service.ingest({
      tenantId: TENANT_A,
      officialRef: 'BOE-A-2026-1',
      sourceUrl: 'https://www.boe.es/eli/es/lo/2026/01/01/1',
      jurisdiction: 'ES',
    });

    expect(snapshot.status).toBe('needs_review');
    expect(snapshot.reasons).toContain('CONSOLIDATION_UNKNOWN');
  });

  it('rechaza hosts no permitidos, HTTP, credenciales y hash distinto', async () => {
    const service = new SourceIngestService(snapshotProvider);
    const base = {
      tenantId: TENANT_A,
      officialRef: 'BOE-A-2026-1',
      jurisdiction: 'ES',
    };

    await expectReason(
      () => service.ingest({ ...base, sourceUrl: 'https://evil.test/ley' }),
      'FORBIDDEN',
      'SOURCE_HOST_NOT_ALLOWED',
    );
    await expectReason(
      () => service.ingest({ ...base, sourceUrl: 'http://www.boe.es/ley' }),
      'INVALID_INPUT',
      'INSECURE_SOURCE_URL',
    );
    await expectReason(
      () => service.ingest({ ...base, sourceUrl: 'https://user:pass@www.boe.es/ley' }),
      'INVALID_INPUT',
      'CREDENTIALS_IN_URL',
    );
    await expectReason(
      () =>
        service.ingest({
          ...base,
          sourceUrl: 'https://www.boe.es/ley',
          expectedHash: sha256Hex('expected'),
        }),
      'UPSTREAM_INVALID',
      'SOURCE_HASH_MISMATCH',
    );
  });

  it('falla cerrado sin proveedor de fuentes', async () => {
    const service = new SourceIngestService(new NotConfiguredSourceSnapshotProvider());
    await expectReason(
      () =>
        service.ingest({
          tenantId: TENANT_A,
          officialRef: 'BOE-A-2026-1',
          sourceUrl: 'https://www.boe.es/ley',
          jurisdiction: 'ES',
        }),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});
