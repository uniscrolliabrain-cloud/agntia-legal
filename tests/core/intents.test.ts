import { describe, expect, it } from 'vitest';
import { hashJson } from '../../src/core/hash.js';
import { IntentService, type ExecuteIntentInput } from '../../src/core/intents.js';
import type { EffectProvider } from '../../src/core/ports.js';
import { InMemoryIntentRepository } from '../../src/persistence/memory.js';
import { NotConfiguredProvider, ScriptedProvider } from '../../src/adapters/provider.js';
import { LegalError } from '../../src/domain/errors.js';
import {
  approvalFor,
  eur,
  makePrincipal,
  PAYLOAD_HASH,
  POLICY_HASH,
  TENANT_A,
} from '../helpers/fixtures.js';

const now = new Date('2026-01-15T00:00:00.000Z');
const payload = { draftHash: 'abc123', recipient: 'registro@example.test' };
const payloadHash = hashJson(payload);

function setup(provider: EffectProvider = new ScriptedProvider()) {
  const repo = new InMemoryIntentRepository();
  const service = new IntentService(repo);
  return { repo, service, provider };
}

function input(overrides: Partial<ExecuteIntentInput> = {}): ExecuteIntentInput {
  return {
    principal: makePrincipal(),
    capability: 'legal.filing.propose',
    idempotencyKey: 'idem_1',
    payload,
    approval: approvalFor({ payloadHash }),
    operation: {
      resourceId: 'fil_1',
      resourceVersion: 3,
      recipient: 'registro@example.test',
      channel: 'filing-gateway',
      scope: 'present-draft',
      policyHash: POLICY_HASH,
      cost: eur('2.50'),
    },
    provider: new ScriptedProvider(),
    purpose: 'present-draft',
    revocationVersion: 0,
    now,
    ...overrides,
  };
}

function capture(promise: Promise<unknown>): Promise<LegalError> {
  return promise.then(
    () => {
      throw new Error('expected a LegalError');
    },
    (error) => {
      if (error instanceof LegalError) return error;
      throw error;
    },
  );
}

describe('intent execution', () => {
  it('previews without touching any provider', async () => {
    const { service, provider } = setup();
    const result = await service.execute(input({ dryRun: true, approval: null }));
    expect(result.intent.status).toBe('proposed');
    expect((provider as ScriptedProvider).effects).toHaveLength(0);
  });

  it('executes once and confirms the effect with a receipt', async () => {
    const { service } = setup();
    const result = await service.execute(input());
    expect(result.intent.status).toBe('confirmed');
    expect(result.intent.receiptRef).toBeTruthy();
    expect(result.replayed).toBe(false);
  });

  it('replays the same key without a second effect', async () => {
    const { service, provider } = setup();
    await service.execute(input({ provider }));
    const replay = await service.execute(input({ provider }));
    expect(replay.replayed).toBe(true);
    expect((provider as ScriptedProvider).effects).toHaveLength(1);
  });

  it('rejects the same key with different content', async () => {
    const { service } = setup();
    await service.execute(input());
    const error = await capture(service.execute(input({ payload: { other: true } })));
    expect(error.code).toBe('CONFLICT');
    expect(error.details.reason).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('leaves an uncertain outcome and reconciles it without duplicating', async () => {
    const timeoutProvider = new ScriptedProvider({ timeoutAfterSubmit: true });
    const { service } = setup(timeoutProvider);
    const first = await service.execute(input({ provider: timeoutProvider }));
    expect(first.intent.status).toBe('outcome_unknown');
    expect(first.intent.reconciliationRequired).toBe(true);
    expect(timeoutProvider.effects).toHaveLength(1);

    const reconciled = await service.reconcile({
      tenantId: TENANT_A,
      intentId: first.intent.id,
      provider: timeoutProvider,
      now,
    });
    expect(reconciled.status).toBe('confirmed');
    expect(timeoutProvider.effects).toHaveLength(1);
  });

  it('escalates when no remote reference can be found', async () => {
    const timeoutProvider = new ScriptedProvider({ timeoutAfterSubmit: true });
    const { service } = setup(timeoutProvider);
    const first = await service.execute(input({ provider: timeoutProvider }));
    const emptyProvider: EffectProvider = {
      id: 'empty',
      status: 'configured',
      execute: async () => {
        throw new Error('not used');
      },
      lookup: async () => null,
    };
    const reconciled = await service.reconcile({
      tenantId: TENANT_A,
      intentId: first.intent.id,
      provider: emptyProvider,
      now,
    });
    expect(reconciled.status).toBe('reconciliation_required');
    expect(reconciled.reasons).toContain('NO_REMOTE_REFERENCE_ESCALATE');
  });

  it('disables the effect when no provider is configured', async () => {
    const { service, repo } = setup();
    const error = await capture(service.execute(input({ provider: new NotConfiguredProvider() })));
    expect(error.code).toBe('CAPABILITY_NOT_VERIFIED');
    const stored = await repo.list(TENANT_A);
    expect(stored[0]?.status).toBe('failed_definitive');
  });

  it('blocks an approval bound to another payload', async () => {
    const { service, repo } = setup();
    const error = await capture(
      service.execute(input({ approval: approvalFor({ payloadHash: PAYLOAD_HASH }) })),
    );
    expect(error.code).toBe('BLOCKED');
    expect(error.details.reasons).toContain('PAYLOAD_CHANGED');
    expect(await repo.list(TENANT_A)).toHaveLength(0);
  });

  it('requires an approval for a sensitive effect', async () => {
    const { service } = setup();
    const error = await capture(service.execute(input({ approval: null })));
    expect(error.details.reason).toBe('APPROVAL_REQUIRED');
  });

  it('requires a delegation for a service actor', async () => {
    const { service } = setup();
    const serviceActor = makePrincipal({ roles: ['service'], kind: 'service' });
    const error = await capture(
      service.execute(input({ principal: serviceActor, mandate: null })),
    );
    expect(error.details.reason).toBe('DELEGATION_REQUIRED');
  });
});
