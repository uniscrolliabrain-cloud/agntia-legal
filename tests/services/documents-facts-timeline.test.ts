import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { sha256Hex } from '../../src/core/hash.js';
import { LegalError } from '../../src/domain/errors.js';
import type { RegisterDocumentInput } from '../../src/services/document-service.js';
import { buildTimeline, deriveDeadlineTrigger } from '../../src/services/timeline-service.js';
import { evidence, TENANT_A, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

async function expectReason(
  run: () => Promise<unknown> | unknown,
  code: string,
  reason?: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(LegalError);
    const legal = error as LegalError;
    expect(legal.code).toBe(code);
    if (reason) expect(legal.details).toMatchObject({ reason });
    return;
  }
  throw new Error(`Expected ${code}${reason ? `/${reason}` : ''}`);
}

function registerInput(overrides: Partial<RegisterDocumentInput> = {}): RegisterDocumentInput {
  return {
    matterId: 'mat_1',
    title: 'Contrato de servicios',
    custodian: 'custodian_1',
    sourceRef: 'src:contrato-1',
    storageRef: 's3://documents/contrato-1.pdf',
    contentHash: sha256Hex('version-1'),
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    receivedAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('custodia documental', () => {
  it('registra la primera versión con su hash original', async () => {
    const { services } = createRuntime();
    const result = await services.documents.register(TENANT_A, 'usr_a', registerInput(), NOW);

    expect(result.duplicate).toBe(false);
    expect(result.version.revision).toBe(1);
    expect(result.version.originalHash).toBe(sha256Hex('version-1'));
    expect(result.document.currentVersion).toBe(1);
    expect(await services.documents.history(TENANT_A, result.document.id)).toHaveLength(1);
  });

  it('re-registrar el mismo contenido es idempotente y no crea revisión', async () => {
    const { services } = createRuntime();
    const first = await services.documents.register(TENANT_A, 'usr_a', registerInput(), NOW);
    const again = await services.documents.register(
      TENANT_A,
      'usr_a',
      registerInput({ documentId: first.document.id }),
      NOW,
    );

    expect(again.duplicate).toBe(true);
    expect(again.version.id).toBe(first.version.id);
    expect(await services.documents.history(TENANT_A, first.document.id)).toHaveLength(1);
  });

  it('un contenido distinto crea una revisión que supersede la anterior', async () => {
    const { services } = createRuntime();
    const first = await services.documents.register(TENANT_A, 'usr_a', registerInput(), NOW);
    const second = await services.documents.register(
      TENANT_A,
      'usr_a',
      registerInput({ documentId: first.document.id, contentHash: sha256Hex('version-2') }),
      NOW,
    );

    expect(second.duplicate).toBe(false);
    expect(second.version.revision).toBe(2);
    expect(second.version.supersedes).toBe(first.version.id);
    expect(second.document.currentVersion).toBe(2);
    const history = await services.documents.history(TENANT_A, first.document.id);
    expect(history.map((version) => version.revision)).toEqual([1, 2]);
  });

  it('detecta un hash que no coincide con la última revisión', async () => {
    const { services } = createRuntime();
    const registered = await services.documents.register(TENANT_A, 'usr_a', registerInput(), NOW);

    const ok = await services.documents.verifyIntegrity(
      TENANT_A,
      registered.document.id,
      sha256Hex('version-1'),
    );
    expect(ok.ok).toBe(true);

    const tampered = await services.documents.verifyIntegrity(
      TENANT_A,
      registered.document.id,
      sha256Hex('otra-cosa'),
    );
    expect(tampered.ok).toBe(false);
    expect(tampered.reasons).toContain('CONTENT_HASH_MISMATCH');
  });

  it('no expone documentos de otro tenant ni acepta hashes inválidos', async () => {
    const { services } = createRuntime();
    const registered = await services.documents.register(TENANT_A, 'usr_a', registerInput(), NOW);

    await expectReason(
      () => services.documents.getDocument(TENANT_B, registered.document.id),
      'NOT_FOUND',
      'DOCUMENT_NOT_FOUND',
    );
    await expectReason(
      () => services.documents.register(TENANT_A, 'usr_a', registerInput({ contentHash: 'abc' }), NOW),
      'INVALID_INPUT',
    );
  });
});

describe('hechos y contradicciones', () => {
  it('solo corrobora con evidencia factual revisada y revisor', async () => {
    const { services } = createRuntime();
    const fact = await services.facts.assert(
      TENANT_A,
      'usr_a',
      {
        matterId: 'mat_1',
        statement: 'El contrato se firmó el 1 de febrero',
        status: 'corroborated',
        evidenceRefs: [evidence(TENANT_A)],
        reviewerRef: 'rev_1',
      },
      NOW,
    );

    expect(fact.status).toBe('corroborated');
  });

  it('bloquea corroborar sin revisor o sin evidencia factual', async () => {
    const { services } = createRuntime();

    await expectReason(
      () =>
        services.facts.assert(
          TENANT_A,
          'usr_a',
          {
            matterId: 'mat_1',
            statement: 'Hecho sin revisor',
            status: 'corroborated',
            evidenceRefs: [evidence(TENANT_A)],
          },
          NOW,
        ),
      'BLOCKED',
      'REVIEW_REQUIRED',
    );

    await expectReason(
      () =>
        services.facts.assert(
          TENANT_A,
          'usr_a',
          {
            matterId: 'mat_1',
            statement: 'Hecho sin fuente factual',
            status: 'corroborated',
            evidenceRefs: [evidence(TENANT_A, 'evd_inf', { kind: 'inference', reviewRef: null })],
            reviewerRef: 'rev_1',
          },
          NOW,
        ),
      'BLOCKED',
      'CORROBORATION_REQUIRES_REVIEWED_FACT',
    );
  });

  it('una contradicción revisada fuerza el estado contradicted', async () => {
    const { services } = createRuntime();
    const fact = await services.facts.assert(
      TENANT_A,
      'usr_a',
      {
        matterId: 'mat_1',
        statement: 'La entrega se produjo el 3 de marzo',
        status: 'corroborated',
        evidenceRefs: [evidence(TENANT_A, 'evd_support')],
        contradictoryEvidenceRefs: [evidence(TENANT_A, 'evd_against')],
        reviewerRef: 'rev_1',
      },
      NOW,
    );

    expect(fact.status).toBe('contradicted');
    expect(await services.facts.contradicted(TENANT_A, 'mat_1')).toHaveLength(1);
  });

  it('una contradicción sin evidencia revisada está bloqueada', async () => {
    const { services } = createRuntime();
    await expectReason(
      () =>
        services.facts.assert(
          TENANT_A,
          'usr_a',
          { matterId: 'mat_1', statement: 'Contradicción sin prueba', status: 'contradicted' },
          NOW,
        ),
      'BLOCKED',
      'CONTRADICTION_REQUIRES_REVIEWED_EVIDENCE',
    );
  });

  it('rechaza evidencia de otro tenant', async () => {
    const { services } = createRuntime();
    await expectReason(
      () =>
        services.facts.assert(
          TENANT_A,
          'usr_a',
          {
            matterId: 'mat_1',
            statement: 'Hecho con prueba ajena',
            status: 'asserted',
            evidenceRefs: [evidence(TENANT_B)],
          },
          NOW,
        ),
      'FORBIDDEN',
      'CROSS_TENANT_EVIDENCE',
    );
  });
});

describe('cronología', () => {
  it('ordena, marca lo probado y lo separa de lo no probado', () => {
    const timeline = buildTimeline([
      { id: 'evt_2', at: '2026-03-02', description: 'Segundo', evidenceRef: 'evd_2' },
      { id: 'evt_1', at: '2026-03-01', description: 'Primero', evidenceRef: null },
      { id: 'evt_3', at: '2026-03-02', description: 'Tercero', evidenceRef: null },
    ]);

    expect(timeline.entries.map((entry) => entry.id)).toEqual(['evt_1', 'evt_2', 'evt_3']);
    expect(timeline.confirmed.map((entry) => entry.id)).toEqual(['evt_2']);
    expect(timeline.unproven.map((entry) => entry.id)).toEqual(['evt_1', 'evt_3']);
  });

  it('rechaza ids duplicados y fechas inválidas', () => {
    expect(() =>
      buildTimeline([
        { id: 'evt_1', at: '2026-03-01', description: 'Uno', evidenceRef: null },
        { id: 'evt_1', at: '2026-03-02', description: 'Dos', evidenceRef: null },
      ]),
    ).toThrow(LegalError);

    expect(() =>
      buildTimeline([{ id: 'evt_1', at: '2026-02-31', description: 'Imposible', evidenceRef: null }]),
    ).toThrow(LegalError);
  });

  it('no deriva un plazo desde un evento sin prueba', () => {
    const timeline = buildTimeline([
      { id: 'evt_1', at: '2026-03-01', description: 'Notificación', evidenceRef: null },
    ]);

    const blocked = deriveDeadlineTrigger(timeline, 'evt_1');
    expect(blocked.status).toBe('blocked');
    expect(blocked.reasons).toContain('MISSING_TRIGGER_PROOF');
    expect(deriveDeadlineTrigger(timeline, 'evt_missing').status).toBe('blocked');
  });

  it('propone el disparador solo con prueba', () => {
    const timeline = buildTimeline([
      { id: 'evt_1', at: '2026-03-01', description: 'Notificación', evidenceRef: 'evd_1' },
    ]);

    const proposed = deriveDeadlineTrigger(timeline, 'evt_1');
    expect(proposed.status).toBe('proposed');
    expect(proposed.trigger).toEqual({ id: 'evt_1', occurredAt: '2026-03-01', evidenceRef: 'evd_1' });
  });
});
