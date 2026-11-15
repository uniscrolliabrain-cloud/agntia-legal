import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';

export interface HandoffPackage {
  id: string;
  tenantId: string;
  fromActorId: string;
  counterpartyRef: string;
  scope: string;
  permissions: string[];
  proofRef: string;
  expiresAt: string;
  status: 'pending_approval' | 'approved' | 'revoked' | 'expired';
  approvalRef: string | null;
  approvedBy: string | null;
  createdAt: string;
}

const FORBIDDEN_PERMISSION = /(\*|admin|owner|all|root)/i;

/**
 * A handoff is a bounded package, not a tenant copy. It needs a proof, cannot
 * carry wildcard/admin permissions and stays pending until a different actor
 * approves it. Expired packages are unusable even if approved.
 */
export class HandoffService {
  private readonly packages = new Map<string, HandoffPackage>();

  create(
    input: {
      tenantId: string;
      fromActorId: string;
      counterpartyRef: string;
      scope: string;
      permissions: string[];
      proofRef: string;
      expiresAt: string;
    },
    now: Date,
  ): HandoffPackage {
    if (input.counterpartyRef.trim().length === 0 || input.scope.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Handoff needs a counterparty and a scope');
    }
    if (input.proofRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'Handoff needs a proof reference', {
        details: { reason: 'HANDOFF_PROOF_REQUIRED' },
      });
    }
    if (input.permissions.length === 0) {
      throw new LegalError('INVALID_INPUT', 'Handoff needs at least one permission');
    }
    const unsafe = input.permissions.filter((permission) => FORBIDDEN_PERMISSION.test(permission));
    if (unsafe.length > 0) {
      throw new LegalError('BLOCKED', 'Handoff cannot carry broad permissions', {
        details: { reason: 'PERMISSION_TOO_BROAD', permissions: unsafe },
      });
    }
    if (new Date(input.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('INVALID_INPUT', 'Handoff must expire in the future');
    }

    const handoff: HandoffPackage = {
      id: `hnd_${randomUUID()}`,
      tenantId: input.tenantId,
      fromActorId: input.fromActorId,
      counterpartyRef: input.counterpartyRef,
      scope: input.scope,
      permissions: [...new Set(input.permissions)],
      proofRef: input.proofRef,
      expiresAt: input.expiresAt,
      status: 'pending_approval',
      approvalRef: null,
      approvedBy: null,
      createdAt: now.toISOString(),
    };
    this.packages.set(`${input.tenantId}:${handoff.id}`, handoff);
    return { ...handoff };
  }

  approve(
    tenantId: string,
    handoffId: string,
    approverId: string,
    approvalRef: string,
    now: Date,
  ): HandoffPackage {
    const handoff = this.load(tenantId, handoffId);
    if (handoff.status !== 'pending_approval') {
      throw new LegalError('BLOCKED', 'Handoff is not pending approval', {
        details: { reason: 'HANDOFF_NOT_PENDING', status: handoff.status },
      });
    }
    if (handoff.fromActorId === approverId) {
      throw new LegalError('BLOCKED', 'The requester cannot approve their own handoff', {
        details: { reason: 'SELF_APPROVAL_NOT_ALLOWED' },
      });
    }
    if (approvalRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'An approval reference is required', {
        details: { reason: 'APPROVAL_REF_REQUIRED' },
      });
    }
    if (new Date(handoff.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Handoff expired', { details: { reason: 'HANDOFF_EXPIRED' } });
    }
    handoff.status = 'approved';
    handoff.approvalRef = approvalRef;
    handoff.approvedBy = approverId;
    return { ...handoff };
  }

  revoke(
    tenantId: string,
    handoffId: string,
    reason: string,
    now: Date,
  ): HandoffPackage {
    const handoff = this.load(tenantId, handoffId);
    if (reason.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A revocation reason is required');
    }
    handoff.status = 'revoked';
    handoff.approvedBy = null;
    handoff.approvalRef = null;
    handoff.expiresAt = now.toISOString();
    return { ...handoff };
  }

  assertUsable(tenantId: string, handoffId: string, now: Date): HandoffPackage {
    const handoff = this.load(tenantId, handoffId);
    if (handoff.status !== 'approved') {
      throw new LegalError('BLOCKED', 'Handoff is not approved', {
        details: { reason: 'HANDOFF_NOT_APPROVED', status: handoff.status },
      });
    }
    if (new Date(handoff.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Handoff expired', { details: { reason: 'HANDOFF_EXPIRED' } });
    }
    return { ...handoff };
  }

  private load(tenantId: string, handoffId: string): HandoffPackage {
    const handoff = this.packages.get(`${tenantId}:${handoffId}`);
    if (!handoff) {
      throw new LegalError('NOT_FOUND', 'Handoff not found', {
        details: { reason: 'HANDOFF_NOT_FOUND' },
      });
    }
    return handoff;
  }
}
