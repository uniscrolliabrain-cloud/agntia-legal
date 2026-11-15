import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { LegalError } from '../../src/domain/errors.js';
import { PrivacyService } from '../../src/services/privacy-service.js';
import { eur, TENANT_A, TENANT_B } from '../helpers/fixtures.js';

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

const reviewInput = {
  matterId: 'mat_1',
  reviewerId: 'usr_b',
  proposerActorId: 'usr_a',
  reviewerQualification: 'Abogada colegiada',
  scope: 'memo',
  findings: ['Se revisaron las fuentes'],
  decision: 'approved' as const,
  signedDecisionRef: 'sig_1',
};

describe('revisión humana', () => {
  it('registra una revisión firmada y localiza la aprobación', async () => {
    const { services } = createRuntime();
    const opinion = await services.reviews.record(TENANT_A, reviewInput, NOW);

    expect(opinion.decision).toBe('approved');
    expect(opinion.signedDecisionRef).toBe('sig_1');

    const latest = await services.reviews.latestApproval(TENANT_A, 'mat_1');
    expect(latest?.id).toBe(opinion.id);
    expect(await services.reviews.latestApproval(TENANT_A, 'mat_2')).toBeNull();
  });

  it('no permite autoaprobarse ni revisar sin cualificación o firma', async () => {
    const { services } = createRuntime();

    await expectReason(
      () => services.reviews.record(TENANT_A, { ...reviewInput, reviewerId: 'usr_a' }, NOW),
      'BLOCKED',
      'SELF_REVIEW_NOT_SUFFICIENT',
    );

    await expectReason(
      () =>
        services.reviews.record(TENANT_A, { ...reviewInput, reviewerQualification: '   ' }, NOW),
      'BLOCKED',
      'QUALIFICATION_REQUIRED',
    );

    await expectReason(
      () => services.reviews.record(TENANT_A, { ...reviewInput, signedDecisionRef: '' }, NOW),
      'BLOCKED',
      'SIGNED_DECISION_REQUIRED',
    );
  });
});

describe('retención', () => {
  it('un hold activo bloquea la exportación hasta que otro actor lo libera', async () => {
    const { services } = createRuntime();
    const hold = await services.retention.place(
      TENANT_A,
      'usr_a',
      {
        retentionRule: 'litigation-hold-2026',
        holdScope: 'matter:mat_1',
        requesterProof: 'proof_1',
      },
      NOW,
    );

    await expectReason(
      () => services.retention.assertExportAllowed(TENANT_A, 'matter:mat_1'),
      'BLOCKED',
      'RETENTION_HOLD_ACTIVE',
    );

    await expectReason(
      () =>
        services.retention.release(
          TENANT_A,
          { holdId: hold.id, actorId: 'usr_a', proofRef: 'proof_2' },
          NOW,
        ),
      'BLOCKED',
      'SELF_RELEASE_NOT_ALLOWED',
    );

    await expectReason(
      () =>
        services.retention.release(
          TENANT_A,
          { holdId: hold.id, actorId: 'usr_b', proofRef: '' },
          NOW,
        ),
      'BLOCKED',
      'RELEASE_PROOF_REQUIRED',
    );

    const released = await services.retention.release(
      TENANT_A,
      { holdId: hold.id, actorId: 'usr_b', proofRef: 'proof_2' },
      NOW,
    );
    expect(released.status).toBe('released');
    await expect(services.retention.assertExportAllowed(TENANT_A, 'matter:mat_1')).resolves.toBeUndefined();
  });
});

describe('presupuesto durable', () => {
  it('reserva, no gasta de más y es idempotente por clave de operación', async () => {
    const { services } = createRuntime();
    services.budget.setBudget(TENANT_A, eur('100.00'));

    const first = await services.budget.reserve(
      { tenantId: TENANT_A, operationKey: 'op_1', amount: eur('60.00') },
      NOW,
    );
    expect(first.replayed).toBe(false);

    await expectReason(
      () =>
        services.budget.reserve(
          { tenantId: TENANT_A, operationKey: 'op_2', amount: eur('50.00') },
          NOW,
        ),
      'BLOCKED',
      'BUDGET_EXCEEDED',
    );

    const replay = await services.budget.reserve(
      { tenantId: TENANT_A, operationKey: 'op_1', amount: eur('60.00') },
      NOW,
    );
    expect(replay.replayed).toBe(true);
    expect(replay.reservation.id).toBe(first.reservation.id);

    await expectReason(
      () =>
        services.budget.reserve(
          { tenantId: TENANT_A, operationKey: 'op_1', amount: eur('70.00') },
          NOW,
        ),
      'CONFLICT',
      'OPERATION_KEY_REUSED',
    );

    await services.budget.release(TENANT_A, first.reservation.id, NOW);
    const second = await services.budget.reserve(
      { tenantId: TENANT_A, operationKey: 'op_3', amount: eur('50.00') },
      NOW,
    );

    await expectReason(
      () => services.budget.consume(TENANT_A, second.reservation.id, eur('60.00'), NOW),
      'BLOCKED',
      'ACTUAL_EXCEEDS_RESERVATION',
    );

    const consumed = await services.budget.consume(
      TENANT_A,
      second.reservation.id,
      eur('50.00'),
      NOW,
    );
    expect(consumed.status).toBe('consumed');

    await expectReason(
      () =>
        services.budget.reserve(
          { tenantId: TENANT_A, operationKey: 'op_4', amount: eur('51.00') },
          NOW,
        ),
      'BLOCKED',
      'BUDGET_EXCEEDED',
    );
  });

  it('sin presupuesto configurado no reserva nada', async () => {
    const { services } = createRuntime();
    await expectReason(
      () =>
        services.budget.reserve(
          { tenantId: TENANT_B, operationKey: 'op_1', amount: eur('1.00') },
          NOW,
        ),
      'BLOCKED',
      'BUDGET_NOT_CONFIGURED',
    );
  });
});

describe('solicitudes de privacidad', () => {
  it('exige prueba de representación cuando no actúa el titular', async () => {
    const { services } = createRuntime();
    const privacy = new PrivacyService(services.retention);

    const represented = await privacy.create(
      TENANT_A,
      {
        type: 'access',
        subjectUserId: 'user_3',
        requesterId: 'usr_agent',
        proofRef: 'proof_1',
        represented: true,
        scope: 'matter:mat_3',
      },
      NOW,
    );

    expect(represented.status).toBe('blocked');
    expect(represented.reasons).toContain('REPRESENTATION_PROOF_REQUIRED');
  });

  it('un hold de retención impide el borrado', async () => {
    const { services } = createRuntime();
    const privacy = new PrivacyService(services.retention);

    await services.retention.place(
      TENANT_A,
      'usr_a',
      {
        retentionRule: 'litigation-hold-2026',
        holdScope: 'matter:mat_9',
        requesterProof: 'proof_1',
      },
      NOW,
    );

    const erasure = await privacy.create(
      TENANT_A,
      {
        type: 'erasure',
        subjectUserId: 'user_9',
        requesterId: 'user_9',
        proofRef: 'proof_1',
        scope: 'matter:mat_9',
      },
      NOW,
    );

    expect(erasure.status).toBe('blocked');
    expect(erasure.reasons).toContain('RETENTION_HOLD_ACTIVE');

    const access = await privacy.create(
      TENANT_A,
      {
        type: 'access',
        subjectUserId: 'user_9',
        requesterId: 'user_9',
        proofRef: 'proof_1',
        scope: 'matter:mat_9',
      },
      NOW,
    );
    expect(access.status).toBe('received');
  });
});
