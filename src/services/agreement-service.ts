import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';
import { capabilitySchema } from '../domain/envelope.js';
import type { Money } from '../domain/ids.js';
import { compareMoney, isPositive } from '../domain/money.js';

export interface ServiceAgreement {
  id: string;
  tenantId: string;
  counterpartyRef: string;
  territories: string[];
  capabilities: string[];
  budget: Money;
  effectiveFrom: string;
  expiresAt: string;
  status: 'draft' | 'active' | 'expired' | 'revoked';
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  agreementId: string;
  purpose: string;
  capabilities: string[];
  budget: Money;
  expiresAt: string;
  status: 'draft' | 'approved' | 'revoked';
  approvedBy: string | null;
}

function assertCapabilities(values: readonly string[]): string[] {
  if (values.length === 0) {
    throw new LegalError('INVALID_INPUT', 'At least one capability is required');
  }
  for (const value of values) {
    if (!capabilitySchema.safeParse(value).success) {
      throw new LegalError('INVALID_INPUT', 'Unknown capability in agreement', {
        details: { reason: 'UNKNOWN_CAPABILITY', capability: value },
      });
    }
  }
  return [...new Set(values)];
}

function assertWindow(effectiveFrom: string, expiresAt: string): void {
  const from = new Date(effectiveFrom).getTime();
  const to = new Date(expiresAt).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    throw new LegalError('INVALID_INPUT', 'Agreement window is invalid');
  }
}

/**
 * A work order can never exceed its agreement: capabilities and budget are
 * subsets and its expiry is bounded by the agreement. Nothing is inferred from
 * a counterparty name or an email domain.
 */
export class AgreementService {
  private readonly agreements = new Map<string, ServiceAgreement>();
  private readonly workOrders = new Map<string, WorkOrder>();

  createAgreement(
    input: {
      tenantId: string;
      counterpartyRef: string;
      territories: string[];
      capabilities: string[];
      budget: Money;
      effectiveFrom: string;
      expiresAt: string;
    },
    _now: Date,
  ): ServiceAgreement {
    if (input.counterpartyRef.trim().length === 0 || input.territories.length === 0) {
      throw new LegalError('INVALID_INPUT', 'Agreement needs a counterparty and territories');
    }
    if (!isPositive(input.budget)) {
      throw new LegalError('INVALID_INPUT', 'Agreement budget must be positive');
    }
    assertWindow(input.effectiveFrom, input.expiresAt);

    const agreement: ServiceAgreement = {
      id: `agr_${randomUUID()}`,
      tenantId: input.tenantId,
      counterpartyRef: input.counterpartyRef,
      territories: [...new Set(input.territories)],
      capabilities: assertCapabilities(input.capabilities),
      budget: { ...input.budget },
      effectiveFrom: input.effectiveFrom,
      expiresAt: input.expiresAt,
      status: 'draft',
    };
    this.agreements.set(`${input.tenantId}:${agreement.id}`, agreement);
    return { ...agreement };
  }

  activate(tenantId: string, agreementId: string, now: Date): ServiceAgreement {
    const agreement = this.loadAgreement(tenantId, agreementId);
    if (agreement.status !== 'draft') {
      throw new LegalError('BLOCKED', 'Only a draft agreement can be activated', {
        details: { reason: 'AGREEMENT_NOT_DRAFT', status: agreement.status },
      });
    }
    if (new Date(agreement.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Agreement already expired', {
        details: { reason: 'AGREEMENT_EXPIRED' },
      });
    }
    agreement.status = 'active';
    return { ...agreement };
  }

  createWorkOrder(
    input: {
      tenantId: string;
      agreementId: string;
      purpose: string;
      capabilities: string[];
      budget: Money;
      expiresAt: string;
    },
    now: Date,
  ): WorkOrder {
    const agreement = this.loadAgreement(input.tenantId, input.agreementId);
    if (agreement.status !== 'active') {
      throw new LegalError('BLOCKED', 'Agreement is not active', {
        details: { reason: 'AGREEMENT_NOT_ACTIVE', status: agreement.status },
      });
    }
    if (new Date(agreement.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Agreement expired', {
        details: { reason: 'AGREEMENT_EXPIRED' },
      });
    }
    if (input.purpose.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Work order needs a purpose');
    }
    if (!isPositive(input.budget)) {
      throw new LegalError('INVALID_INPUT', 'Work order budget must be positive');
    }
    if (compareMoney(input.budget, agreement.budget) > 0) {
      throw new LegalError('BLOCKED', 'Work order budget exceeds the agreement', {
        details: { reason: 'BUDGET_EXCEEDS_AGREEMENT' },
      });
    }
    if (new Date(input.expiresAt).getTime() > new Date(agreement.expiresAt).getTime()) {
      throw new LegalError('BLOCKED', 'Work order expires after the agreement', {
        details: { reason: 'EXPIRY_EXCEEDS_AGREEMENT' },
      });
    }

    const capabilities = assertCapabilities(input.capabilities);
    const outside = capabilities.filter((capability) => !agreement.capabilities.includes(capability));
    if (outside.length > 0) {
      throw new LegalError('BLOCKED', 'Work order requests capabilities outside the agreement', {
        details: { reason: 'CAPABILITY_OUTSIDE_AGREEMENT', capabilities: outside },
      });
    }

    const workOrder: WorkOrder = {
      id: `wor_${randomUUID()}`,
      tenantId: input.tenantId,
      agreementId: agreement.id,
      purpose: input.purpose,
      capabilities,
      budget: { ...input.budget },
      expiresAt: input.expiresAt,
      status: 'draft',
      approvedBy: null,
    };
    this.workOrders.set(`${input.tenantId}:${workOrder.id}`, workOrder);
    return { ...workOrder };
  }

  approveWorkOrder(
    tenantId: string,
    workOrderId: string,
    approverId: string,
    now: Date,
  ): WorkOrder {
    const workOrder = this.loadWorkOrder(tenantId, workOrderId);
    if (workOrder.status !== 'draft') {
      throw new LegalError('BLOCKED', 'Only a draft work order can be approved', {
        details: { reason: 'WORK_ORDER_NOT_DRAFT', status: workOrder.status },
      });
    }
    if (approverId.trim().length === 0) {
      throw new LegalError('BLOCKED', 'An approver is required', {
        details: { reason: 'APPROVER_REQUIRED' },
      });
    }
    if (new Date(workOrder.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Work order expired', {
        details: { reason: 'WORK_ORDER_EXPIRED' },
      });
    }
    workOrder.status = 'approved';
    workOrder.approvedBy = approverId;
    return { ...workOrder };
  }

  private loadAgreement(tenantId: string, agreementId: string): ServiceAgreement {
    const agreement = this.agreements.get(`${tenantId}:${agreementId}`);
    if (!agreement) {
      throw new LegalError('NOT_FOUND', 'Agreement not found', {
        details: { reason: 'AGREEMENT_NOT_FOUND' },
      });
    }
    return agreement;
  }

  private loadWorkOrder(tenantId: string, workOrderId: string): WorkOrder {
    const workOrder = this.workOrders.get(`${tenantId}:${workOrderId}`);
    if (!workOrder) {
      throw new LegalError('NOT_FOUND', 'Work order not found', {
        details: { reason: 'WORK_ORDER_NOT_FOUND' },
      });
    }
    return workOrder;
  }
}
