import { describe, expect, it } from 'vitest';
import {
  NotConfiguredAnamProvider,
  NotConfiguredSignatureProvider,
  type SignatureProvider,
} from '../../src/adapters/external.js';
import { sha256Hex } from '../../src/core/hash.js';
import { LegalError } from '../../src/domain/errors.js';
import { AgreementService } from '../../src/services/agreement-service.js';
import { ConnectionService } from '../../src/services/connection-service.js';
import { FilingService } from '../../src/services/filing-service.js';
import { HandoffService } from '../../src/services/handoff-service.js';
import { PartyService } from '../../src/services/party-service.js';
import { PortalService } from '../../src/services/portal-service.js';
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

describe('acuerdos y órdenes de trabajo', () => {
  function setup() {
    const service = new AgreementService();
    const agreement = service.createAgreement(
      {
        tenantId: TENANT_A,
        counterpartyRef: 'cpty_1',
        territories: ['ES'],
        capabilities: ['legal.matter.read', 'legal.citation.verify'],
        budget: eur('1000.00'),
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
      NOW,
    );
    return { service, agreement };
  }

  it('activa el acuerdo y crea una orden dentro de sus límites', () => {
    const { service, agreement } = setup();
    expect(() =>
      service.createWorkOrder(
        {
          tenantId: TENANT_A,
          agreementId: agreement.id,
          purpose: 'review',
          capabilities: ['legal.matter.read'],
          budget: eur('100.00'),
          expiresAt: '2026-06-30T00:00:00.000Z',
        },
        NOW,
      ),
    ).toThrow(LegalError);

    service.activate(TENANT_A, agreement.id, NOW);
    const workOrder = service.createWorkOrder(
      {
        tenantId: TENANT_A,
        agreementId: agreement.id,
        purpose: 'review',
        capabilities: ['legal.matter.read'],
        budget: eur('100.00'),
        expiresAt: '2026-06-30T00:00:00.000Z',
      },
      NOW,
    );
    expect(workOrder.status).toBe('draft');

    const approved = service.approveWorkOrder(TENANT_A, workOrder.id, 'usr_owner', NOW);
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('usr_owner');
  });

  it('no permite capacidades, presupuesto ni vigencia fuera del acuerdo', () => {
    const { service, agreement } = setup();
    service.activate(TENANT_A, agreement.id, NOW);
    const base = {
      tenantId: TENANT_A,
      agreementId: agreement.id,
      purpose: 'review',
      capabilities: ['legal.matter.read'],
      budget: eur('100.00'),
      expiresAt: '2026-06-30T00:00:00.000Z',
    };

    expect(() =>
      service.createWorkOrder(
        { ...base, capabilities: ['legal.filing.propose'] },
        NOW,
      ),
    ).toThrow(LegalError);
    expect(() => service.createWorkOrder({ ...base, budget: eur('2000.00') }, NOW)).toThrow(
      LegalError,
    );
    expect(() =>
      service.createWorkOrder({ ...base, expiresAt: '2027-06-30T00:00:00.000Z' }, NOW),
    ).toThrow(LegalError);
    expect(() => service.activate(TENANT_B, agreement.id, NOW)).toThrow(LegalError);
  });
});

describe('ciclo de conexiones', () => {
  it('solo acepta referencias de secreto y permite verificar y revocar', () => {
    const service = new ConnectionService();
    expect(() =>
      service.register(
        {
          tenantId: TENANT_A,
          providerId: 'openai',
          secretRef: 'sk-live-abc123',
          scopes: ['models'],
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
        NOW,
      ),
    ).toThrow(LegalError);

    const connection = service.register(
      {
        tenantId: TENANT_A,
        providerId: 'openai',
        secretRef: 'vault:legal/openai',
        scopes: ['models'],
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
      NOW,
    );
    expect(connection.status).toBe('pending_verification');
    expect(service.activeFor(TENANT_A, 'openai', NOW)).toBeNull();

    const verified = service.markVerified(TENANT_A, connection.id, 'usr_owner', NOW);
    expect(verified.status).toBe('active');
    expect(service.activeFor(TENANT_A, 'openai', NOW)?.id).toBe(connection.id);

    const revoked = service.revoke(TENANT_A, connection.id, 'rotación de clave', NOW);
    expect(revoked.status).toBe('revoked');
    expect(service.activeFor(TENANT_A, 'openai', NOW)).toBeNull();
    expect(() => service.markVerified(TENANT_A, connection.id, 'usr_owner', NOW)).toThrow(LegalError);
  });
});

describe('partes y representación', () => {
  it('exige prueba y confirmación por otro actor; retirar revoca', async () => {
    const service = new PartyService();
    const party = service.addParty(
      { tenantId: TENANT_A, matterId: 'mat_1', partyRef: 'party_1', role: 'client' },
      NOW,
    );

    expect(() =>
      service.addRepresentation(
        {
          tenantId: TENANT_A,
          matterId: 'mat_1',
          partyId: party.id,
          representativeRef: 'counsel_1',
          proofRef: '',
          scope: 'representación procesal',
          requestedBy: 'usr_a',
        },
        NOW,
      ),
    ).toThrow(LegalError);

    const representation = service.addRepresentation(
      {
        tenantId: TENANT_A,
        matterId: 'mat_1',
        partyId: party.id,
        representativeRef: 'counsel_1',
        proofRef: 'proof_1',
        scope: 'representación procesal',
        requestedBy: 'usr_a',
      },
      NOW,
    );
    expect(representation.status).toBe('pending');

    await expectReason(
      () => service.confirmRepresentation(TENANT_A, representation.id, 'usr_a', NOW),
      'BLOCKED',
      'SELF_CONFIRMATION_NOT_ALLOWED',
    );

    const confirmed = service.confirmRepresentation(TENANT_A, representation.id, 'usr_b', NOW);
    expect(confirmed.status).toBe('confirmed');

    service.remove(TENANT_A, party.id, NOW);
    const afterRemoval = service.representationsFor(TENANT_A, 'mat_1');
    expect(afterRemoval[0]?.status).toBe('revoked');
    expect(service.list(TENANT_A, 'mat_1')).toHaveLength(0);
  });
});

describe('handoff empresarial', () => {
  it('requiere aprobación independiente y permisos acotados', async () => {
    const service = new HandoffService();
    expect(() =>
      service.create(
        {
          tenantId: TENANT_A,
          fromActorId: 'usr_a',
          counterpartyRef: 'group_1',
          scope: 'due diligence',
          permissions: ['tenant:*'],
          proofRef: 'proof_1',
          expiresAt: '2026-06-30T00:00:00.000Z',
        },
        NOW,
      ),
    ).toThrow(LegalError);

    const handoff = service.create(
      {
        tenantId: TENANT_A,
        fromActorId: 'usr_a',
        counterpartyRef: 'group_1',
        scope: 'due diligence',
        permissions: ['legal.matter.read'],
        proofRef: 'proof_1',
        expiresAt: '2026-06-30T00:00:00.000Z',
      },
      NOW,
    );
    expect(handoff.status).toBe('pending_approval');

    await expectReason(
      () => service.approve(TENANT_A, handoff.id, 'usr_a', 'apr_1', NOW),
      'BLOCKED',
      'SELF_APPROVAL_NOT_ALLOWED',
    );
    await expectReason(
      () => service.assertUsable(TENANT_A, handoff.id, NOW),
      'BLOCKED',
      'HANDOFF_NOT_APPROVED',
    );

    service.approve(TENANT_A, handoff.id, 'usr_b', 'apr_1', NOW);
    expect(service.assertUsable(TENANT_A, handoff.id, NOW).status).toBe('approved');

    service.revoke(TENANT_A, handoff.id, 'fin de la operación', NOW);
    await expectReason(
      () => service.assertUsable(TENANT_A, handoff.id, NOW),
      'BLOCKED',
      'HANDOFF_NOT_APPROVED',
    );
  });
});

describe('portal y presencia', () => {
  it('solo cliente o staff escriben y el handoff se marca', async () => {
    const service = new PortalService(new NotConfiguredAnamProvider());
    const thread = service.openThread({ tenantId: TENANT_A, subjectRef: 'cli_1' }, NOW);

    const message = service.postMessage(
      {
        tenantId: TENANT_A,
        threadId: thread.id,
        authorRole: 'client',
        authorRef: 'cli_1',
        bodyRef: 'store://msg/1',
      },
      NOW,
    );
    expect(message.authorRole).toBe('client');
    expect(service.messagesFor(TENANT_A, thread.id)).toHaveLength(1);

    expect(() =>
      service.postMessage(
        {
          tenantId: TENANT_A,
          threadId: thread.id,
          authorRole: 'system' as 'client',
          authorRef: 'bot',
          bodyRef: 'store://msg/2',
        },
        NOW,
      ),
    ).toThrow(LegalError);

    expect(service.requestHumanHandoff(TENANT_A, thread.id, NOW).status).toBe(
      'handoff_requested',
    );
    await expectReason(
      () => service.startPresence(TENANT_A, thread.id, 'cli_1'),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});

describe('propuesta de presentación', () => {
  it('exige approval y una firma verificada; nunca presenta', async () => {
    const verifiedSignature: SignatureProvider = {
      id: 'signature.test',
      status: 'configured',
      async sign() {
        return { signatureRef: 'sig_1', signedAt: NOW.toISOString(), verified: true };
      },
    };
    const service = new FilingService(verifiedSignature);
    const base = {
      tenantId: TENANT_A,
      matterId: 'mat_1',
      documentHash: sha256Hex('filing'),
      recipient: 'registro@example.test',
      channel: 'filing-gateway',
      scope: 'present-draft',
      approvalRef: '',
      signatureRequired: false,
    };

    await expectReason(
      () => service.propose(base, NOW),
      'BLOCKED',
      'APPROVAL_REQUIRED',
    );

    const proposed = await service.propose(
      { ...base, approvalRef: 'apr_1' },
      NOW,
    );
    expect(proposed.status).toBe('proposed');
    expect(proposed.reasons).toContain('NO_EXTERNAL_SUBMISSION');

    const signed = await service.propose(
      { ...base, approvalRef: 'apr_1', signatureRequired: true, signerRef: 'usr_signer' },
      NOW,
    );
    expect(signed.signatureRef).toBe('sig_1');

    const unavailable = new FilingService(new NotConfiguredSignatureProvider());
    await expectReason(
      () =>
        unavailable.propose(
          { ...base, approvalRef: 'apr_1', signatureRequired: true, signerRef: 'usr_signer' },
          NOW,
        ),
      'CAPABILITY_NOT_VERIFIED',
      'PROVIDER_NOT_CONFIGURED',
    );
  });
});
