import { randomUUID } from 'node:crypto';
import type { SignatureProvider } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import { sha256HexSchema } from '../domain/ids.js';

export interface FilingInput {
  tenantId: string;
  matterId: string;
  documentHash: string;
  recipient: string;
  channel: string;
  scope: string;
  approvalRef: string;
  signatureRequired: boolean;
  signerRef?: string | null;
}

export interface FilingProposal {
  id: string;
  tenantId: string;
  matterId: string;
  documentHash: string;
  recipient: string;
  channel: string;
  scope: string;
  approvalRef: string;
  signatureRef: string | null;
  status: 'proposed';
  reasons: string[];
  createdAt: string;
}

/**
 * A proposal is never a presentation: the service returns `proposed` and does
 * not call any court or registry. A required signature is delegated to a
 * verified provider; without one the proposal is blocked.
 */
export class FilingService {
  constructor(private readonly signature: SignatureProvider) {}

  get signatureStatus(): 'configured' | 'not_configured' {
    return this.signature.status;
  }

  async propose(input: FilingInput, now: Date): Promise<FilingProposal> {
    if (!sha256HexSchema.safeParse(input.documentHash).success) {
      throw new LegalError('INVALID_INPUT', 'A document hash is required');
    }
    if (input.recipient.trim().length === 0 || input.channel.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Filing needs a recipient and a channel');
    }
    if (input.approvalRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'Filing requires an approval reference', {
        details: { reason: 'APPROVAL_REQUIRED' },
      });
    }

    let signatureRef: string | null = null;
    const reasons = ['NO_EXTERNAL_SUBMISSION'];
    if (input.signatureRequired) {
      if (!input.signerRef) {
        throw new LegalError('BLOCKED', 'A signer reference is required', {
          details: { reason: 'SIGNER_REQUIRED' },
        });
      }
      const signed = await this.signature.sign({
        tenantId: input.tenantId,
        documentHash: input.documentHash,
        signerRef: input.signerRef,
        purpose: input.scope,
      });
      if (!signed.verified) {
        throw new LegalError('CAPABILITY_NOT_VERIFIED', 'Signature is not verified', {
          details: { reason: 'SIGNATURE_NOT_VERIFIED', provider: this.signature.id },
        });
      }
      signatureRef = signed.signatureRef;
    }

    return {
      id: `fil_${randomUUID()}`,
      tenantId: input.tenantId,
      matterId: input.matterId,
      documentHash: input.documentHash,
      recipient: input.recipient,
      channel: input.channel,
      scope: input.scope,
      approvalRef: input.approvalRef,
      signatureRef,
      status: 'proposed',
      reasons,
      createdAt: now.toISOString(),
    };
  }
}
