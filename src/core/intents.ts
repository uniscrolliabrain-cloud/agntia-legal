import { randomUUID } from 'node:crypto';
import { assertApprovalValid, type ApprovalBinding } from '../domain/approval.js';
import { assertNoSecretMaterial, type Capability } from '../domain/envelope.js';
import { LegalError } from '../domain/errors.js';
import type { Money } from '../domain/ids.js';
import { assertOperationTransition, type OperationState } from '../domain/states.js';
import { hashJson } from './hash.js';
import { authorize, assertMandate, type Principal, type TwinBinding } from './policy.js';
import {
  ProviderRejectedError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  type EffectProvider,
  type IntentAttempt,
  type IntentRecord,
  type IntentRepository,
} from './ports.js';

export interface IntentOperationContext {
  resourceId: string;
  resourceVersion: number;
  recipient: string;
  channel: string;
  scope: string;
  policyHash: string;
  cost?: Money;
}

export interface ExecuteIntentInput {
  principal: Principal;
  capability: Capability;
  idempotencyKey: string;
  payload: unknown;
  approval: ApprovalBinding | null;
  operation: IntentOperationContext;
  provider: EffectProvider;
  purpose: string;
  /** Current tenant revocation version, compared with the approval. */
  revocationVersion: number;
  mandate?: TwinBinding | null;
  now: Date;
  dryRun?: boolean;
}

export interface ExecuteIntentResult {
  intent: IntentRecord;
  replayed: boolean;
}

const TERMINAL: readonly OperationState[] = ['confirmed', 'failed_definitive', 'cancelled'];

/**
 * Single execution path for sensitive effects.
 *
 * Invariants: authorization first, approval bound to the exact payload, one
 * durable intent per (tenant, capability, idempotencyKey), no blind retry after
 * a timeout and reconciliation by remote reference instead of a new key.
 */
export class IntentService {
  constructor(private readonly intents: IntentRepository) {}

  async execute(input: ExecuteIntentInput): Promise<ExecuteIntentResult> {
    const tenantId = input.principal.tenantId;

    if (input.principal.kind === 'service') {
      // Service workers hold no role capabilities: they act only under a
      // verified delegation and never impersonate a human principal.
      if (!input.mandate) {
        throw new LegalError('FORBIDDEN', 'Service actor requires a delegation mandate', {
          details: { reason: 'DELEGATION_REQUIRED' },
        });
      }
      assertMandate(input.mandate, {
        capability: input.capability,
        targetTenantId: tenantId,
        purpose: input.purpose,
        now: input.now,
        revocationVersion: input.revocationVersion,
      });
    } else {
      authorize(input.principal, { capability: input.capability, tenantId });
      authorize(input.principal, { capability: 'legal.intent.execute', tenantId });
    }

    assertNoSecretMaterial(input.payload);
    const payloadHash = hashJson(input.payload);

    const existing = await this.intents.findByKey(tenantId, input.capability, input.idempotencyKey);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new LegalError('CONFLICT', 'Idempotency key was reused with different content', {
          details: { reason: 'IDEMPOTENCY_KEY_REUSED', intentId: existing.id },
        });
      }
      return { intent: existing, replayed: true };
    }

    if (input.dryRun) {
      const preview = await this.intents.create(
        this.newRecord(input, payloadHash, 'proposed', null, false),
      );
      return { intent: preview, replayed: false };
    }

    if (!input.approval) {
      throw new LegalError('BLOCKED', 'A sensitive effect requires an approval binding', {
        details: { reason: 'APPROVAL_REQUIRED' },
      });
    }

    assertApprovalValid(input.approval, {
      tenantId,
      resourceId: input.operation.resourceId,
      resourceVersion: input.operation.resourceVersion,
      payloadHash,
      recipient: input.operation.recipient,
      channel: input.operation.channel,
      scope: input.operation.scope,
      policyHash: input.operation.policyHash,
      ...(input.operation.cost ? { cost: input.operation.cost } : {}),
      now: input.now,
      revocationVersion: input.revocationVersion,
    });

    let intent = await this.intents.create(
      this.newRecord(input, payloadHash, 'queued', input.approval.id, false),
    );

    if (input.provider.status !== 'configured') {
      intent = await this.save(
        intent,
        { status: 'failed_definitive', reasons: ['PROVIDER_NOT_CONFIGURED'] },
        input.now,
      );
      throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Effect provider is not configured', {
        details: { providerId: input.provider.id, intentId: intent.id },
      });
    }

    intent = await this.save(intent, { status: 'running' }, input.now);
    const startedAt = input.now.toISOString();

    try {
      const receipt = await input.provider.execute({
        tenantId,
        capability: input.capability,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        payload: input.payload,
        approvalRef: input.approval.id,
      });

      intent = await this.save(
        intent,
        {
          attempts: [
            ...intent.attempts,
            this.attempt(intent, 'provider_accepted', startedAt, receipt.providerRef, input.now),
          ],
          status: 'accepted',
          receiptRef: receipt.providerRef,
          remoteRef: receipt.providerRef,
          reasons: receipt.verified ? [] : ['OUTCOME_NOT_VERIFIED'],
        },
        input.now,
      );

      if (receipt.verified) {
        assertOperationTransition('accepted', 'confirmed', {
          hasReceipt: true,
          outcomeVerified: true,
        });
        intent = await this.save(intent, { status: 'confirmed', reconciliationRequired: false }, input.now);
      }
      return { intent, replayed: false };
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        intent = await this.save(
          intent,
          {
            attempts: [
              ...intent.attempts,
              this.attempt(intent, 'provider_timeout', startedAt, null, input.now),
            ],
            status: 'outcome_unknown',
            reasons: [...intent.reasons, 'TIMEOUT_AFTER_SUBMIT'],
            reconciliationRequired: true,
          },
          input.now,
        );
        return { intent, replayed: false };
      }

      if (error instanceof ProviderUnavailableError) {
        intent = await this.save(
          intent,
          {
            attempts: [
              ...intent.attempts,
              this.attempt(intent, 'provider_unavailable', startedAt, null, input.now),
            ],
            status: 'failed_definitive',
            reasons: [...intent.reasons, 'PROVIDER_UNAVAILABLE_BEFORE_SUBMIT'],
          },
          input.now,
        );
        return { intent, replayed: false };
      }

      if (error instanceof ProviderRejectedError) {
        intent = await this.save(
          intent,
          {
            attempts: [
              ...intent.attempts,
              this.attempt(intent, 'provider_error', startedAt, null, input.now),
            ],
            status: 'failed_definitive',
            reasons: [...intent.reasons, error.code],
          },
          input.now,
        );
        return { intent, replayed: false };
      }

      // Unknown failure after submission: assume it may have taken effect.
      intent = await this.save(
        intent,
        {
          attempts: [
            ...intent.attempts,
            this.attempt(intent, 'provider_error', startedAt, null, input.now),
          ],
          status: 'outcome_unknown',
          reasons: [...intent.reasons, 'UNCLASSIFIED_ERROR_AFTER_SUBMIT'],
          reconciliationRequired: true,
        },
        input.now,
      );
      return { intent, replayed: false };
    }
  }

  /**
   * Resolves an uncertain outcome. It never issues a second effect and never
   * invents success: without a remote reference it escalates for a human.
   */
  async reconcile(input: {
    tenantId: string;
    intentId: string;
    provider: EffectProvider;
    now: Date;
  }): Promise<IntentRecord> {
    const intent = await this.intents.get(input.tenantId, input.intentId);
    if (!intent) {
      throw new LegalError('NOT_FOUND', 'Intent not found', {
        details: { reason: 'INTENT_NOT_FOUND' },
      });
    }
    if (TERMINAL.includes(intent.status)) return intent;

    let receipt = null;
    try {
      receipt = await input.provider.lookup({
        tenantId: input.tenantId,
        idempotencyKey: intent.idempotencyKey,
      });
    } catch {
      receipt = null;
    }

    if (receipt) {
      let next = await this.save(
        intent,
        {
          status: 'accepted',
          receiptRef: receipt.providerRef,
          remoteRef: receipt.providerRef,
          reconciliationRequired: false,
          reasons: receipt.verified ? [] : ['OUTCOME_NOT_VERIFIED'],
        },
        input.now,
      );
      if (receipt.verified) {
        next = await this.save(next, { status: 'confirmed' }, input.now);
      }
      return next;
    }

    return this.save(
      intent,
      {
        status: 'reconciliation_required',
        reconciliationRequired: true,
        reasons: [...new Set([...intent.reasons, 'NO_REMOTE_REFERENCE_ESCALATE'])],
      },
      input.now,
    );
  }

  private newRecord(
    input: ExecuteIntentInput,
    payloadHash: string,
    status: OperationState,
    approvalRef: string | null,
    reconciliationRequired: boolean,
  ): IntentRecord {
    const timestamp = input.now.toISOString();
    return {
      id: `int_${randomUUID()}`,
      tenantId: input.principal.tenantId,
      actorId: input.principal.actorId,
      capability: input.capability,
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      approvalRef,
      status,
      receiptRef: null,
      remoteRef: null,
      reasons: [],
      attempts: [],
      reconciliationRequired,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
  }

  private attempt(
    intent: IntentRecord,
    outcome: IntentAttempt['outcome'],
    startedAt: string,
    providerRef: string | null,
    now: Date,
  ): IntentAttempt {
    return {
      attempt: intent.attempts.length + 1,
      startedAt,
      finishedAt: now.toISOString(),
      outcome,
      providerRef,
    };
  }

  private async save(
    intent: IntentRecord,
    patch: Partial<IntentRecord>,
    now: Date,
  ): Promise<IntentRecord> {
    const updated: IntentRecord = {
      ...intent,
      ...patch,
      version: intent.version + 1,
      updatedAt: now.toISOString(),
    };
    return this.intents.update(updated, intent.version);
  }
}
