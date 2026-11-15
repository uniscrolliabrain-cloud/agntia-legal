import { randomUUID } from 'node:crypto';
import { LegalError } from '../domain/errors.js';

/** A reference to a secret store entry, never raw credential material. */
const SECRET_REF = /^(vault|doppler|aws-sm|gcp-sm|ref):[A-Za-z0-9:/_.-]+$/;

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  providerId: string;
  secretRef: string;
  scopes: string[];
  status: 'pending_verification' | 'active' | 'revoked';
  createdAt: string;
  expiresAt: string;
  verifiedBy: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
}

/**
 * Connections hold references into a secret store. A value that looks like a
 * token, key or password is rejected before storage; verification is a separate
 * human act and revocation keeps the record for audit.
 */
export class ConnectionService {
  private readonly connections = new Map<string, IntegrationConnection>();

  register(
    input: {
      tenantId: string;
      providerId: string;
      secretRef: string;
      scopes: string[];
      expiresAt: string;
    },
    now: Date,
  ): IntegrationConnection {
    if (input.providerId.trim().length === 0 || input.scopes.length === 0) {
      throw new LegalError('INVALID_INPUT', 'Connection needs a provider and scopes');
    }
    if (!SECRET_REF.test(input.secretRef)) {
      throw new LegalError('INVALID_INPUT', 'A secret reference is required, not a secret', {
        details: { reason: 'SECRET_REFERENCE_REQUIRED' },
      });
    }
    if (new Date(input.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('INVALID_INPUT', 'Connection must expire in the future');
    }

    const connection: IntegrationConnection = {
      id: `con_${randomUUID()}`,
      tenantId: input.tenantId,
      providerId: input.providerId,
      secretRef: input.secretRef,
      scopes: [...new Set(input.scopes)],
      status: 'pending_verification',
      createdAt: now.toISOString(),
      expiresAt: input.expiresAt,
      verifiedBy: null,
      revokedAt: null,
      revocationReason: null,
    };
    this.connections.set(`${input.tenantId}:${connection.id}`, connection);
    return { ...connection };
  }

  markVerified(
    tenantId: string,
    connectionId: string,
    verifierId: string,
    now: Date,
  ): IntegrationConnection {
    const connection = this.load(tenantId, connectionId);
    if (connection.status !== 'pending_verification') {
      throw new LegalError('BLOCKED', 'Connection is not pending verification', {
        details: { reason: 'CONNECTION_NOT_PENDING', status: connection.status },
      });
    }
    if (new Date(connection.expiresAt).getTime() <= now.getTime()) {
      throw new LegalError('BLOCKED', 'Connection expired', {
        details: { reason: 'CONNECTION_EXPIRED' },
      });
    }
    if (verifierId.trim().length === 0) {
      throw new LegalError('BLOCKED', 'A verifier is required', {
        details: { reason: 'VERIFIER_REQUIRED' },
      });
    }
    connection.status = 'active';
    connection.verifiedBy = verifierId;
    return { ...connection };
  }

  revoke(
    tenantId: string,
    connectionId: string,
    reason: string,
    now: Date,
  ): IntegrationConnection {
    const connection = this.load(tenantId, connectionId);
    if (connection.status === 'revoked') {
      return { ...connection };
    }
    if (reason.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A revocation reason is required');
    }
    connection.status = 'revoked';
    connection.revokedAt = now.toISOString();
    connection.revocationReason = reason;
    return { ...connection };
  }

  activeFor(tenantId: string, providerId: string, now: Date): IntegrationConnection | null {
    for (const connection of this.connections.values()) {
      if (
        connection.tenantId === tenantId &&
        connection.providerId === providerId &&
        connection.status === 'active' &&
        new Date(connection.expiresAt).getTime() > now.getTime()
      ) {
        return { ...connection };
      }
    }
    return null;
  }

  private load(tenantId: string, connectionId: string): IntegrationConnection {
    const connection = this.connections.get(`${tenantId}:${connectionId}`);
    if (!connection) {
      throw new LegalError('NOT_FOUND', 'Connection not found', {
        details: { reason: 'CONNECTION_NOT_FOUND' },
      });
    }
    return connection;
  }
}
