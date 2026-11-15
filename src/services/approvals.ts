import type { ApprovalBinding } from '../domain/approval.js';
import { LegalError } from '../domain/errors.js';

function keyOf(tenantId: string, id: string): string {
  return `${tenantId}::${id}`;
}

/**
 * Approvals are stored per tenant and can be revoked. Revocation increments the
 * tenant revocation version, which invalidates every approval still bound to
 * the previous version.
 */
export class ApprovalStore {
  private readonly approvals = new Map<string, ApprovalBinding>();

  save(approval: ApprovalBinding): ApprovalBinding {
    this.approvals.set(keyOf(approval.tenantId, approval.id), { ...approval });
    return { ...approval };
  }

  get(tenantId: string, id: string): ApprovalBinding | null {
    const found = this.approvals.get(keyOf(tenantId, id));
    return found ? { ...found } : null;
  }

  revoke(tenantId: string, id: string, at: Date): ApprovalBinding {
    const found = this.approvals.get(keyOf(tenantId, id));
    if (!found) {
      throw new LegalError('NOT_FOUND', 'Approval not found', {
        details: { reason: 'APPROVAL_NOT_FOUND' },
      });
    }
    const revoked: ApprovalBinding = {
      ...found,
      revokedAt: at.toISOString(),
      revocationVersion: found.revocationVersion + 1,
    };
    this.approvals.set(keyOf(tenantId, id), revoked);
    return { ...revoked };
  }
}
