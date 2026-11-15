import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';

export const PARTY_ROLES = ['client', 'counterparty', 'counsel', 'third_party'] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export interface MatterParty {
  id: string;
  tenantId: string;
  matterId: string;
  partyRef: string;
  role: PartyRole;
  status: 'active' | 'removed';
  createdAt: string;
}

export interface Representation {
  id: string;
  tenantId: string;
  matterId: string;
  partyId: string;
  representativeRef: string;
  proofRef: string;
  scope: string;
  status: 'pending' | 'confirmed' | 'revoked';
  requestedBy: string;
  confirmedBy: string | null;
  updatedAt: string;
}

/**
 * Parties are references, not free-text identities. Representation needs a
 * proof and is confirmed by an actor other than the requester; removing a party
 * revokes its representations instead of deleting history.
 */
export class PartyService {
  private readonly parties = new Map<string, MatterParty>();
  private readonly representations = new Map<string, Representation>();

  addParty(
    input: { tenantId: string; matterId: string; partyRef: string; role: PartyRole },
    now: Date,
  ): MatterParty {
    if (input.partyRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A party reference is required');
    }
    if (!PARTY_ROLES.includes(input.role)) {
      throw new LegalError('INVALID_INPUT', 'Unknown party role');
    }
    const duplicate = [...this.parties.values()].find(
      (party) =>
        party.tenantId === input.tenantId &&
        party.matterId === input.matterId &&
        party.partyRef === input.partyRef &&
        party.role === input.role &&
        party.status === 'active',
    );
    if (duplicate) {
      return { ...duplicate };
    }

    const party: MatterParty = {
      id: `pty_${randomUUID()}`,
      tenantId: input.tenantId,
      matterId: input.matterId,
      partyRef: input.partyRef,
      role: input.role,
      status: 'active',
      createdAt: now.toISOString(),
    };
    this.parties.set(`${input.tenantId}:${party.id}`, party);
    return { ...party };
  }

  list(tenantId: string, matterId: string): MatterParty[] {
    return [...this.parties.values()]
      .filter(
        (party) =>
          party.tenantId === tenantId && party.matterId === matterId && party.status === 'active',
      )
      .map((party) => ({ ...party }));
  }

  remove(tenantId: string, partyId: string, now: Date): MatterParty {
    const party = this.loadParty(tenantId, partyId);
    party.status = 'removed';
    for (const representation of this.representations.values()) {
      if (
        representation.tenantId === tenantId &&
        representation.partyId === party.id &&
        representation.status !== 'revoked'
      ) {
        representation.status = 'revoked';
        representation.updatedAt = now.toISOString();
      }
    }
    return { ...party };
  }

  addRepresentation(
    input: {
      tenantId: string;
      matterId: string;
      partyId: string;
      representativeRef: string;
      proofRef: string;
      scope: string;
      requestedBy: string;
    },
    now: Date,
  ): Representation {
    const party = this.loadParty(input.tenantId, input.partyId);
    if (party.status !== 'active' || party.matterId !== input.matterId) {
      throw new LegalError('BLOCKED', 'Party is not active in this matter', {
        details: { reason: 'PARTY_NOT_ACTIVE' },
      });
    }
    if (input.proofRef.trim().length === 0) {
      throw new LegalError('BLOCKED', 'Representation needs a proof reference', {
        details: { reason: 'REPRESENTATION_PROOF_REQUIRED' },
      });
    }
    const duplicate = [...this.representations.values()].find(
      (representation) =>
        representation.tenantId === input.tenantId &&
        representation.partyId === input.partyId &&
        representation.representativeRef === input.representativeRef &&
        representation.scope === input.scope &&
        representation.status !== 'revoked',
    );
    if (duplicate) {
      return { ...duplicate };
    }

    const representation: Representation = {
      id: `rep_${randomUUID()}`,
      tenantId: input.tenantId,
      matterId: input.matterId,
      partyId: input.partyId,
      representativeRef: input.representativeRef,
      proofRef: input.proofRef,
      scope: input.scope,
      status: 'pending',
      requestedBy: input.requestedBy,
      confirmedBy: null,
      updatedAt: now.toISOString(),
    };
    this.representations.set(`${input.tenantId}:${representation.id}`, representation);
    return { ...representation };
  }

  confirmRepresentation(
    tenantId: string,
    representationId: string,
    approverId: string,
    now: Date,
  ): Representation {
    const representation = this.loadRepresentation(tenantId, representationId);
    if (representation.status !== 'pending') {
      throw new LegalError('BLOCKED', 'Representation is not pending', {
        details: { reason: 'REPRESENTATION_NOT_PENDING', status: representation.status },
      });
    }
    if (representation.requestedBy === approverId) {
      throw new LegalError('BLOCKED', 'The requester cannot confirm their own representation', {
        details: { reason: 'SELF_CONFIRMATION_NOT_ALLOWED' },
      });
    }
    representation.status = 'confirmed';
    representation.confirmedBy = approverId;
    representation.updatedAt = now.toISOString();
    return { ...representation };
  }

  representationsFor(tenantId: string, matterId: string): Representation[] {
    return [...this.representations.values()]
      .filter(
        (representation) =>
          representation.tenantId === tenantId && representation.matterId === matterId,
      )
      .map((representation) => ({ ...representation }));
  }

  private loadParty(tenantId: string, partyId: string): MatterParty {
    const party = this.parties.get(`${tenantId}:${partyId}`);
    if (!party) {
      throw new LegalError('NOT_FOUND', 'Party not found', { details: { reason: 'PARTY_NOT_FOUND' } });
    }
    return party;
  }

  private loadRepresentation(tenantId: string, representationId: string): Representation {
    const representation = this.representations.get(`${tenantId}:${representationId}`);
    if (!representation) {
      throw new LegalError('NOT_FOUND', 'Representation not found', {
        details: { reason: 'REPRESENTATION_NOT_FOUND' },
      });
    }
    return representation;
  }
}
