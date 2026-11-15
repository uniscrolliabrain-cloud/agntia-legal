import type { OperationState } from '../domain/states.js';

export interface ScopeAware {
  id: string;
  tenantId: string;
  version: number;
}

/**
 * Tenant-scoped repository port. Implementations must never return a record
 * from another tenant: a foreign id behaves exactly like a missing id.
 */
export interface Repository<T extends ScopeAware> {
  get(tenantId: string, id: string): Promise<T | null>;
  list(tenantId: string): Promise<T[]>;
  create(record: T): Promise<T>;
  /** Compare-and-set: fails with CONFLICT when the stored version differs. */
  update(record: T, expectedVersion: number): Promise<T>;
}

export interface IntentAttempt {
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  outcome: 'provider_accepted' | 'provider_timeout' | 'provider_unavailable' | 'provider_error';
  providerRef: string | null;
}

export interface IntentRecord extends ScopeAware {
  id: string;
  tenantId: string;
  actorId: string;
  capability: string;
  idempotencyKey: string;
  payloadHash: string;
  approvalRef: string | null;
  status: OperationState;
  receiptRef: string | null;
  remoteRef: string | null;
  reasons: string[];
  attempts: IntentAttempt[];
  reconciliationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntentRepository extends Repository<IntentRecord> {
  findByKey(tenantId: string, capability: string, idempotencyKey: string): Promise<IntentRecord | null>;
}

export interface ProviderRequest {
  tenantId: string;
  capability: string;
  idempotencyKey: string;
  payloadHash: string;
  payload: unknown;
  approvalRef: string | null;
}

export interface ProviderReceipt {
  providerRef: string;
  acceptedAt: string;
  /** True only when the provider confirms the effect, not merely receipt. */
  verified: boolean;
}

export interface EffectProvider {
  readonly id: string;
  readonly status: 'configured' | 'not_configured';
  execute(request: ProviderRequest): Promise<ProviderReceipt>;
  /** Safe lookup by the durable idempotency key, used for reconciliation. */
  lookup(request: { tenantId: string; idempotencyKey: string }): Promise<ProviderReceipt | null>;
}

export class ProviderTimeoutError extends Error {
  constructor(message = 'Provider timed out after possible acceptance') {
    super(message);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends Error {
  constructor(message = 'Provider unavailable before submission') {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderRejectedError extends Error {
  readonly code: string;
  constructor(code: string, message = 'Provider rejected the operation') {
    super(message);
    this.name = 'ProviderRejectedError';
    this.code = code;
  }
}
