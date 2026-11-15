import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { LegalError } from '../../src/domain/errors.js';
import { proposeClause } from '../../src/services/clause-service.js';
import { proposeDraft } from '../../src/services/draft-service.js';
import { buildTenantArchive, restoreTenantArchive } from '../../src/services/export-service.js';
import { proposeMemo } from '../../src/services/memo-service.js';
import { proposeObligation } from '../../src/services/obligation-service.js';
import { proposeRisk } from '../../src/services/risk-service.js';
import { evidence, TENANT_A } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

describe('memo de investigación', () => {
  it('solo queda propuesto con autoridades verificadas y cobertura completa', () => {
    const result = proposeMemo({
      issue: '¿Es válida la cláusula de sumisión?',
      citations: [{ citation: 'STS 1/2020', status: 'verified' }],
      requiredQuestions: ['competencia', 'nulidad'],
      answeredQuestions: ['competencia', 'nulidad'],
      contraryAuthorities: ['STS 2/2021'],
    });

    expect(result.status).toBe('proposed');
    expect(result.requiresReview).toBe(true);
    expect(result.contraryAuthorities).toEqual(['STS 2/2021']);
  });

  it('marca needs_review sin autoridades, con fuentes sin verificar o cobertura incompleta', () => {
    const withoutAuthorities = proposeMemo({
      issue: 'Cuestión',
      citations: [],
      requiredQuestions: ['q1'],
      answeredQuestions: ['q1'],
    });
    expect(withoutAuthorities.status).toBe('needs_review');
    expect(withoutAuthorities.reasons).toContain('NO_AUTHORITIES');

    const unverified = proposeMemo({
      issue: 'Cuestión',
      citations: [{ citation: 'SAN 9/2019', status: 'needs_review' }],
      requiredQuestions: ['q1'],
      answeredQuestions: ['q1'],
    });
    expect(unverified.reasons).toContain('UNVERIFIED_AUTHORITY:SAN 9/2019');

    const incomplete = proposeMemo({
      issue: 'Cuestión',
      citations: [{ citation: 'STS 1/2020', status: 'verified' }],
      requiredQuestions: ['q1', 'q2'],
      answeredQuestions: ['q1'],
    });
    expect(incomplete.status).toBe('needs_review');
    expect(incomplete.coverage.missing).toEqual(['q2']);
  });
});

describe('borrador y playbook', () => {
  it('bloquea campos requeridos sin evidencia y nunca inventa valores', () => {
    const result = proposeDraft({
      templateId: 'tpl_nda',
      requiredFields: ['partyA', 'partyB', 'effectiveDate'],
      fields: {
        partyA: { value: 'ACME SL', evidenceRef: 'evd_1' },
        partyB: { value: '', evidenceRef: null },
        effectiveDate: { value: '2026-01-01', evidenceRef: 'evd_2' },
        importe: { value: '100.000', evidenceRef: null },
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.missing).toContain('partyB');
    expect(result.unsupported).toEqual(['importe']);
    expect(result.values.partyA).toBe('ACME SL');
    expect(result.values.importe).toBeUndefined();
  });

  it('propone solo cuando todos los campos requeridos están soportados', () => {
    const result = proposeDraft({
      templateId: 'tpl_nda',
      requiredFields: ['partyA'],
      fields: { partyA: { value: 'ACME SL', evidenceRef: 'evd_1' } },
    });
    expect(result.status).toBe('proposed');
  });

  it('distingue texto dentro del playbook de una excepción', () => {
    const within = proposeClause({
      clauseType: 'confidencialidad',
      jurisdiction: 'ES',
      approvedOptions: ['La parte receptora no divulgará la información.'],
      proposedText: '  la PARTE   receptora no divulgará la información. ',
    });
    expect(within.status).toBe('within_playbook');
    expect(within.requiresReview).toBe(false);

    const exception = proposeClause({
      clauseType: 'confidencialidad',
      jurisdiction: 'ES',
      approvedOptions: ['La parte receptora no divulgará la información.'],
      proposedText: 'La parte receptora podrá divulgar la información a terceros.',
    });
    expect(exception.status).toBe('exception_proposed');
    expect(exception.requiresReview).toBe(true);
    expect(exception.reasons).toContain('OUTSIDE_APPROVED_OPTIONS');
  });
});

describe('riesgos y obligaciones', () => {
  it('un riesgo sin fuente es una señal no verificada, no un dictamen', () => {
    const signal = proposeRisk({ description: 'Posible caducidad', severity: 'high', evidenceRef: null });
    expect(signal.status).toBe('signal_unverified');
    expect(signal.reasons).toContain('NO_SOURCE');

    const reported = proposeRisk({
      description: 'Posible caducidad',
      severity: 'high',
      evidenceRef: 'evd_1',
      policyMaxSeverity: 'medium',
    });
    expect(reported.status).toBe('reported');
    expect(reported.reasons).toContain('SEVERITY_ABOVE_POLICY_CEILING');
  });

  it('una obligación sin instrumento firmado queda propuesta, no activa', () => {
    const draft = proposeObligation({
      obligationSource: 'Cláusula 7',
      trigger: 'renovación tácita',
      owner: 'Legal',
      reviewAt: '2026-06-01',
      signedInstrumentRef: null,
    });
    expect(draft.status).toBe('proposed');
    expect(draft.reasons).toContain('INSTRUMENT_NOT_SIGNED');

    const active = proposeObligation({
      obligationSource: 'Cláusula 7',
      trigger: 'renovación tácita',
      owner: 'Legal',
      reviewAt: '2026-06-01',
      signedInstrumentRef: 'doc_7',
      instrumentStatus: 'signed',
    });
    expect(active.status).toBe('active');

    const blocked = proposeObligation({
      obligationSource: 'Cláusula 7',
      trigger: 'renovación tácita',
      owner: ' ',
      reviewAt: '2026-06-01',
      signedInstrumentRef: 'doc_7',
      instrumentStatus: 'signed',
    });
    expect(blocked.status).toBe('blocked');
    expect(blocked.reasons).toContain('MISSING_OWNER');
  });
});

describe('archivo y restauración', () => {
  it('restaura sin resucitar asuntos suprimidos, hechos ni permisos', async () => {
    const runtime = createRuntime();
    const matter = await runtime.services.matters.intake(
      TENANT_A,
      'usr_a',
      {
        requestingActorId: 'usr_a',
        title: 'Asunto archivado',
        purpose: 'Prueba',
        territory: 'ES',
        applicableDate: '2026-01-01',
        requestedAction: 'Informe',
        scopeComplete: true,
      },
      NOW,
    );
    const fact = await runtime.services.facts.assert(
      TENANT_A,
      'usr_a',
      {
        matterId: matter.id,
        statement: 'Hecho archivado',
        status: 'asserted',
        evidenceRefs: [evidence(TENANT_A)],
      },
      NOW,
    );
    const hold = await runtime.services.retention.place(
      TENANT_A,
      'usr_a',
      { retentionRule: 'litigation', holdScope: `matter:${matter.id}`, requesterProof: 'proof_1' },
      NOW,
    );
    const released = await runtime.services.retention.release(
      TENANT_A,
      { holdId: hold.id, actorId: 'usr_b', proofRef: 'proof_2' },
      NOW,
    );

    const archive = buildTenantArchive({
      tenantId: TENANT_A,
      matters: [matter],
      facts: [fact],
      holds: [released],
      revokedUserIds: ['user_9'],
      now: NOW,
    });

    const restored = restoreTenantArchive(archive, {
      suppressedMatterIds: [matter.id],
      now: NOW,
    });

    expect(restored.matters).toHaveLength(0);
    expect(restored.droppedMatters).toEqual([matter.id]);
    expect(restored.droppedFacts).toEqual([fact.id]);
    expect(restored.facts).toHaveLength(0);
    expect(restored.holds[0]?.status).toBe('released');
    expect(restored.revokedUserIds).toContain('user_9');
    expect(restored.notes).toContain('NO_PERMISSION_FROM_ARCHIVE');
  });

  it('conserva los asuntos y hechos no suprimidos', async () => {
    const runtime = createRuntime();
    const matter = await runtime.services.matters.intake(
      TENANT_A,
      'usr_a',
      {
        requestingActorId: 'usr_a',
        title: 'Asunto vigente',
        purpose: 'Prueba',
        territory: 'ES',
        applicableDate: '2026-01-01',
        requestedAction: 'Informe',
        scopeComplete: true,
      },
      NOW,
    );
    const fact = await runtime.services.facts.assert(
      TENANT_A,
      'usr_a',
      { matterId: matter.id, statement: 'Hecho vigente', status: 'asserted' },
      NOW,
    );

    const archive = buildTenantArchive({
      tenantId: TENANT_A,
      matters: [matter],
      facts: [fact],
      holds: [],
      now: NOW,
    });
    const restored = restoreTenantArchive(archive, { now: NOW });

    expect(restored.matters.map((entry) => entry.id)).toEqual([matter.id]);
    expect(restored.facts.map((entry) => entry.id)).toEqual([fact.id]);
  });

  it('rechaza archivos inválidos', () => {
    expect(() =>
      buildTenantArchive({ tenantId: TENANT_A, matters: [], facts: [], holds: [], now: NOW }),
    ).not.toThrow();
    expect(() => restoreTenantArchive(null as never, { now: NOW })).toThrow();
    expect(() => proposeDraft({ templateId: '', requiredFields: ['x'], fields: {} })).toThrow(
      LegalError,
    );
  });
});
