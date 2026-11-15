import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { LegalError } from '../../src/domain/errors.js';
import { assessApplicableLaw } from '../../src/services/jurisdiction-service.js';
import { makePrincipal, TENANT_A } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

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

describe('revisión de conflictos', () => {
  async function setup() {
    const runtime = createRuntime();
    const matter = await runtime.services.matters.intake(
      TENANT_A,
      'usr_a',
      {
        requestingActorId: 'usr_a',
        title: 'Revisión de contrato',
        purpose: 'Revisar cláusulas',
        territory: 'ES',
        applicableDate: '2026-01-01',
        requestedAction: 'Emitir informe',
        scopeComplete: true,
      },
      NOW,
    );
    const conflict = await runtime.services.matters.recordConflictCheck(
      TENANT_A,
      'usr_a',
      {
        matterId: matter.id,
        partyRefs: ['party_1'],
        representation: 'contraparte',
        result: 'possible_conflict',
      },
      NOW,
    );
    return { runtime, matter, conflict };
  }

  it('impide que el solicitante revise su propio chequeo', async () => {
    const { runtime, conflict } = await setup();
    await expectReason(
      () =>
        runtime.services.matters.reviewConflict({
          tenantId: TENANT_A,
          actorId: 'usr_a',
          checkId: conflict.id,
          reviewerRef: 'rev_1',
          decision: 'cleared',
          rationale: 'Sin conflicto',
          now: NOW,
        }),
      'BLOCKED',
      'SELF_REVIEW_NOT_SUFFICIENT',
    );
  });

  it('un revisor distinto puede limpiar un posible conflicto', async () => {
    const { runtime, matter, conflict } = await setup();
    expect(await runtime.services.matters.openConflictCount(TENANT_A, matter.id)).toBe(1);

    const reviewed = await runtime.services.matters.reviewConflict({
      tenantId: TENANT_A,
      actorId: 'usr_b',
      checkId: conflict.id,
      reviewerRef: 'rev_1',
      decision: 'cleared',
      rationale: 'Contraparte no relacionada',
      now: NOW,
    });

    expect(reviewed.result).toBe('clear');
    expect(reviewed.reviewerRef).toBe('rev_1');
    expect(reviewed.version).toBe(2);
    expect(await runtime.services.matters.openConflictCount(TENANT_A, matter.id)).toBe(0);
  });

  it('un conflicto confirmado no se puede limpiar', async () => {
    const { runtime, matter } = await setup();
    const confirmed = await runtime.services.matters.recordConflictCheck(
      TENANT_A,
      'usr_a',
      {
        matterId: matter.id,
        partyRefs: ['party_2'],
        representation: 'cliente previo',
        result: 'conflict',
      },
      NOW,
    );

    await expectReason(
      () =>
        runtime.services.matters.reviewConflict({
          tenantId: TENANT_A,
          actorId: 'usr_b',
          checkId: confirmed.id,
          reviewerRef: 'rev_1',
          decision: 'cleared',
          rationale: 'Intento de limpieza',
          now: NOW,
        }),
      'BLOCKED',
      'CONFIRMED_CONFLICT_CANNOT_BE_CLEARED',
    );
  });

  it('mantener el conflicto exige referencia de revisor', async () => {
    const { runtime, conflict } = await setup();
    await expectReason(
      () =>
        runtime.services.matters.reviewConflict({
          tenantId: TENANT_A,
          actorId: 'usr_b',
          checkId: conflict.id,
          reviewerRef: '',
          decision: 'upheld',
          rationale: 'Sin referencia',
          now: NOW,
        }),
      'BLOCKED',
      'REVIEWER_REF_REQUIRED',
    );

    const upheld = await runtime.services.matters.reviewConflict({
      tenantId: TENANT_A,
      actorId: 'usr_b',
      checkId: conflict.id,
      reviewerRef: 'rev_1',
      decision: 'upheld',
      rationale: 'Existe conflicto',
      now: NOW,
    });
    expect(upheld.result).toBe('conflict');
  });
});

describe('confidencialidad y acceso', () => {
  const owner = makePrincipal({ userId: 'user-1', roles: ['owner'] });
  const collaborator = makePrincipal({ userId: 'user-2', roles: ['collaborator'] });

  it('sin base explícita un asunto queda restringido', () => {
    const { services } = createRuntime();
    const { access, reasons } = services.access.assess({
      tenantId: TENANT_A,
      matterId: 'mat_1',
      privilege: 'not_privileged',
    });

    expect(access.restricted).toBe(true);
    expect(reasons).toContain('PRIVILEGE_BASIS_REQUIRED');
  });

  it('un asunto no privilegiado con base es legible por un colaborador', () => {
    const { services } = createRuntime();
    const { access } = services.access.assess({
      tenantId: TENANT_A,
      matterId: 'mat_1',
      privilege: 'not_privileged',
      basis: 'Informe previo del cliente',
    });

    expect(access.restricted).toBe(false);
    expect(() => services.access.authorizeRead(collaborator, access, NOW)).not.toThrow();
  });

  it('un asunto privilegiado solo lo lee el owner o un share vigente', () => {
    const { services } = createRuntime();
    const { access } = services.access.assess({
      tenantId: TENANT_A,
      matterId: 'mat_1',
      privilege: 'privileged',
      basis: 'Secreto profesional',
    });

    expect(access.restricted).toBe(true);
    expect(() => services.access.authorizeRead(owner, access, NOW)).not.toThrow();
    expect(() => services.access.authorizeRead(collaborator, access, NOW)).toThrow(LegalError);

    const shared = services.access.share({
      access,
      principal: owner,
      targetUserId: collaborator.userId,
      purpose: 'Revisión puntual',
      expiresAt: '2026-04-01T00:00:00.000Z',
      now: NOW,
    });
    expect(() => services.access.authorizeRead(collaborator, shared, NOW)).not.toThrow();
    expect(() =>
      services.access.authorizeRead(collaborator, shared, new Date('2026-05-01T00:00:00.000Z')),
    ).toThrow(LegalError);
  });

  it('solo el owner comparte y el share debe expirar en el futuro', () => {
    const { services } = createRuntime();
    const { access } = services.access.assess({
      tenantId: TENANT_A,
      matterId: 'mat_1',
      privilege: 'privileged',
      basis: 'Secreto profesional',
    });

    expect(() =>
      services.access.share({
        access,
        principal: collaborator,
        targetUserId: 'user-3',
        purpose: 'Intento',
        expiresAt: '2026-04-01T00:00:00.000Z',
        now: NOW,
      }),
    ).toThrow(LegalError);

    expect(() =>
      services.access.share({
        access,
        principal: owner,
        targetUserId: 'user-3',
        purpose: 'Sin vigencia',
        expiresAt: '2026-01-01T00:00:00.000Z',
        now: NOW,
      }),
    ).toThrow(LegalError);
  });
});

describe('ley aplicable y competencia', () => {
  it('confirma un territorio estatal con fecha válida', () => {
    const result = assessApplicableLaw({
      territory: 'ES',
      applicableDate: '2026-01-01',
      euMemberState: true,
    });
    expect(result.status).toBe('confirmed');
    expect(result.levels).toEqual(['EU', 'ES']);
  });

  it('no confirma competencia autonómica sin verificación explícita', () => {
    const pending = assessApplicableLaw({
      territory: 'ES-CT',
      applicableDate: '2026-01-01',
      subnationalCompetence: 'pending',
    });
    expect(pending.status).toBe('needs_review');
    expect(pending.reasons).toContain('SUBNATIONAL_COMPETENCE_PENDING');

    const confirmed = assessApplicableLaw({
      territory: 'ES-CT',
      applicableDate: '2026-01-01',
      subnationalCompetence: 'confirmed',
    });
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.levels).toEqual(['ES-CT', 'ES']);
  });

  it('marca la contradicción entre territorio aplicable y alegado', () => {
    const result = assessApplicableLaw({
      territory: 'ES',
      applicableDate: '2026-01-01',
      claimTerritory: 'ES-CT',
    });
    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('CLAIM_TERRITORY_MISMATCH');
  });

  it('bloquea fechas y territorios inválidos', () => {
    expect(
      assessApplicableLaw({ territory: 'ES', applicableDate: '2026-02-31' }).status,
    ).toBe('blocked');
    expect(assessApplicableLaw({ territory: 'X', applicableDate: '2026-01-01' }).status).toBe(
      'blocked',
    );
  });
});
