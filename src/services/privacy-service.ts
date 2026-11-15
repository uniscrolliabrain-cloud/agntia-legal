import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';
import type { RetentionService } from './retention-service.js';

export type PrivacyRequestType = 'access' | 'erasure' | 'rectification';

export interface PrivacyRequestInput {
  type: PrivacyRequestType;
  subjectUserId: string;
  requesterId: string;
  proofRef: string;
  represented?: boolean;
  representationProofRef?: string | null;
  scope: string;
}

export interface PrivacyRequestResult {
  id: string;
  tenantId: string;
  type: PrivacyRequestType;
  subjectUserId: string;
  requesterId: string;
  status: 'received' | 'blocked';
  reasons: string[];
  createdAt: string;
}

/**
 * A privacy request needs an identity/representation proof. Disposition
 * (erasure) is blocked while a retention hold applies; nothing is deleted from
 * a chat message or a model instruction.
 */
export class PrivacyService {
  constructor(private readonly holds: RetentionService) {}

  async create(
    tenantId: string,
    input: PrivacyRequestInput,
    now: Date,
  ): Promise<PrivacyRequestResult> {
    if (input.proofRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A privacy request requires a proof reference');
    }
    if (input.scope.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A privacy request requires a scope');
    }

    const reasons: string[] = [];
    if (
      input.represented === true &&
      input.requesterId !== input.subjectUserId &&
      !input.representationProofRef
    ) {
      reasons.push('REPRESENTATION_PROOF_REQUIRED');
    }

    if (input.type === 'erasure') {
      try {
        await this.holds.assertExportAllowed(tenantId, input.scope);
      } catch (error) {
        if (error instanceof LegalError && error.code === 'BLOCKED') {
          reasons.push('RETENTION_HOLD_ACTIVE');
        } else {
          throw error;
        }
      }
    }

    return {
      id: `prv_${randomUUID()}`,
      tenantId,
      type: input.type,
      subjectUserId: input.subjectUserId,
      requesterId: input.requesterId,
      status: reasons.length > 0 ? 'blocked' : 'received',
      reasons,
      createdAt: now.toISOString(),
    };
  }
}
