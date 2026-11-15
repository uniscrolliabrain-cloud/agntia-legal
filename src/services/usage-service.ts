import { randomUUID } from 'node:crypto';
import type { ModelGateway, ModelRequest, ModelResult } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import type { Money } from '../domain/ids.js';
import { addMoney, compareMoney } from '../domain/money.js';

export interface UsageRecord {
  id: string;
  tenantId: string;
  operationKey: string;
  model: string;
  purpose: string;
  inputTokens: number;
  outputTokens: number;
  cost: Money;
  recordedAt: string;
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: Money | null;
}

/**
 * Usage is recorded per operation key, so a retry cannot double-count cost.
 * Only token counts, a model identifier and a cost are stored: no prompt, no
 * completion and no user content.
 */
export class UsageService {
  private readonly records: UsageRecord[] = [];

  record(
    input: {
      tenantId: string;
      operationKey: string;
      model: string;
      purpose: string;
      inputTokens: number;
      outputTokens: number;
      cost: Money;
    },
    now: Date,
  ): UsageRecord {
    if (input.inputTokens < 0 || input.outputTokens < 0) {
      throw new LegalError('INVALID_INPUT', 'Token counts cannot be negative');
    }
    if (compareMoney(input.cost, { ...input.cost, amount: '0' }) < 0) {
      throw new LegalError('INVALID_INPUT', 'Cost cannot be negative');
    }
    const existing = this.records.find(
      (record) =>
        record.tenantId === input.tenantId && record.operationKey === input.operationKey,
    );
    if (existing) return { ...existing };

    const record: UsageRecord = {
      id: `usg_${randomUUID()}`,
      tenantId: input.tenantId,
      operationKey: input.operationKey,
      model: input.model,
      purpose: input.purpose,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cost: { ...input.cost },
      recordedAt: now.toISOString(),
    };
    this.records.push(record);
    return { ...record };
  }

  totals(tenantId: string): UsageTotals {
    const records = this.records.filter((record) => record.tenantId === tenantId);
    if (records.length === 0) {
      return { calls: 0, inputTokens: 0, outputTokens: 0, cost: null };
    }
    const cost = records.reduce<Money>((total, record) => addMoney(total, record.cost), {
      ...records[0]!.cost,
      amount: '0',
    });
    return {
      calls: records.length,
      inputTokens: records.reduce((total, record) => total + record.inputTokens, 0),
      outputTokens: records.reduce((total, record) => total + record.outputTokens, 0),
      cost,
    };
  }
}

/**
 * The model service never sees raw prompts: it receives a `promptRef` and
 * records cost/usage only after the gateway confirms the call.
 */
export class ModelService {
  constructor(
    private readonly gateway: ModelGateway,
    private readonly usage: UsageService,
  ) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.gateway.status;
  }

  async run(
    input: Omit<ModelRequest, 'tenantId'> & { tenantId: string; operationKey: string },
    now: Date,
  ): Promise<{ result: ModelResult; usage: UsageRecord }> {
    if (input.purpose.trim().length === 0 || input.promptRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Model calls need a purpose and a prompt reference');
    }
    if (input.maxOutputTokens <= 0 || input.maxOutputTokens > 100_000) {
      throw new LegalError('INVALID_INPUT', 'Invalid output token budget');
    }

    const result = await this.gateway.complete(input);
    const usage = this.usage.record(
      {
        tenantId: input.tenantId,
        operationKey: input.operationKey,
        model: input.model,
        purpose: input.purpose,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: result.cost,
      },
      now,
    );
    return { result, usage };
  }
}
