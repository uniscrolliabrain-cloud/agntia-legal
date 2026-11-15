import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hashJson } from '../core/hash.js';
import { LegalError } from './errors.js';
import { isoDateTimeSchema, moneySchema, opaqueIdSchema, sha256HexSchema, type Money } from './ids.js';
import { compareMoney } from './money.js';

export { compareMoney } from './money.js';

/**
 * Approval is bound to material facts, not to a chat sentence: tenant,
 * resource and version, payload hash, scope, recipient/channel, policy/rights,
 * cost ceiling and expiry. Any material change invalidates it.
 */
export const approvalBindingSchema = z
  .object({
    id: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    resourceId: opaqueIdSchema,
    resourceVersion: z.number().int().min(1),
    principalId: opaqueIdSchema,
    principalRole: z.string().min(1).max(64),
    proofRef: opaqueIdSchema,
    payloadHash: sha256HexSchema,
    rightsHash: sha256HexSchema,
    policyHash: sha256HexSchema,
    recipient: z.string().min(1).max(320),
    channel: z.string().min(1).max(64),
    scope: z.string().min(1).max(512),
    costCeiling: moneySchema,
    issuedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    revocationVersion: z.number().int().min(0),
    revokedAt: isoDateTimeSchema.nullable(),
    approvalHash: sha256HexSchema,
  })
  .strict();

export type ApprovalBinding = z.infer<typeof approvalBindingSchema>;

export interface ApprovalMaterial {
  tenantId: string;
  resourceId: string;
  resourceVersion: number;
  principalId: string;
  principalRole: string;
  proofRef: string;
  payloadHash: string;
  rightsHash: string;
  policyHash: string;
  recipient: string;
  channel: string;
  scope: string;
  costCeiling: Money;
  issuedAt: string;
  expiresAt: string;
  revocationVersion: number;
}

export interface CreateApprovalInput extends ApprovalMaterial {
  id?: string;
}

function approvalHashMaterial(material: ApprovalMaterial): Record<string, unknown> {
  return {
    tenantId: material.tenantId,
    resourceId: material.resourceId,
    resourceVersion: material.resourceVersion,
    principalId: material.principalId,
    principalRole: material.principalRole,
    proofRef: material.proofRef,
    payloadHash: material.payloadHash,
    rightsHash: material.rightsHash,
    policyHash: material.policyHash,
    recipient: material.recipient,
    channel: material.channel,
    scope: material.scope,
    costCeiling: material.costCeiling,
    issuedAt: material.issuedAt,
    expiresAt: material.expiresAt,
    revocationVersion: material.revocationVersion,
  };
}

export function computeApprovalHash(material: ApprovalMaterial): string {
  return hashJson(approvalHashMaterial(material));
}

export function createApproval(input: CreateApprovalInput): ApprovalBinding {
  const issuedAt = new Date(input.issuedAt).getTime();
  const expiresAt = new Date(input.expiresAt).getTime();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw new LegalError('INVALID_INPUT', 'Approval expiry must be after issuance', {
      details: { reason: 'INVALID_APPROVAL_WINDOW' },
    });
  }
  const material: ApprovalMaterial = {
    tenantId: input.tenantId,
    resourceId: input.resourceId,
    resourceVersion: input.resourceVersion,
    principalId: input.principalId,
    principalRole: input.principalRole,
    proofRef: input.proofRef,
    payloadHash: input.payloadHash,
    rightsHash: input.rightsHash,
    policyHash: input.policyHash,
    recipient: input.recipient,
    channel: input.channel,
    scope: input.scope,
    costCeiling: input.costCeiling,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    revocationVersion: input.revocationVersion,
  };
  return approvalBindingSchema.parse({
    ...material,
    id: input.id ?? `apr_${randomUUID()}`,
    revokedAt: null,
    approvalHash: computeApprovalHash(material),
  });
}

export interface ApprovalRequest {
  tenantId: string;
  resourceId: string;
  resourceVersion: number;
  payloadHash: string;
  recipient: string;
  channel: string;
  scope: string;
  policyHash: string;
  cost?: Money;
  now: Date;
  revocationVersion: number;
}

/**
 * Returns every failed binding check. The caller turns a non-empty list into a
 * block; it is never downgraded to a warning for a sensitive effect.
 */
export function checkApproval(approval: ApprovalBinding, request: ApprovalRequest): string[] {
  const failures: string[] = [];
  const recomputed = computeApprovalHash({
    tenantId: approval.tenantId,
    resourceId: approval.resourceId,
    resourceVersion: approval.resourceVersion,
    principalId: approval.principalId,
    principalRole: approval.principalRole,
    proofRef: approval.proofRef,
    payloadHash: approval.payloadHash,
    rightsHash: approval.rightsHash,
    policyHash: approval.policyHash,
    recipient: approval.recipient,
    channel: approval.channel,
    scope: approval.scope,
    costCeiling: approval.costCeiling,
    issuedAt: approval.issuedAt,
    expiresAt: approval.expiresAt,
    revocationVersion: approval.revocationVersion,
  });
  if (recomputed !== approval.approvalHash) failures.push('APPROVAL_HASH_MISMATCH');
  if (approval.tenantId !== request.tenantId) failures.push('TENANT_MISMATCH');
  if (approval.resourceId !== request.resourceId) failures.push('RESOURCE_MISMATCH');
  if (approval.resourceVersion !== request.resourceVersion) failures.push('VERSION_CHANGED');
  if (approval.payloadHash !== request.payloadHash) failures.push('PAYLOAD_CHANGED');
  if (approval.recipient !== request.recipient) failures.push('RECIPIENT_CHANGED');
  if (approval.channel !== request.channel) failures.push('CHANNEL_CHANGED');
  if (approval.scope !== request.scope) failures.push('SCOPE_CHANGED');
  if (approval.policyHash !== request.policyHash) failures.push('POLICY_CHANGED');
  if (approval.revocationVersion !== request.revocationVersion) failures.push('REVOCATION_VERSION_CHANGED');
  if (approval.revokedAt !== null) failures.push('APPROVAL_REVOKED');
  if (request.now.getTime() >= new Date(approval.expiresAt).getTime()) failures.push('APPROVAL_EXPIRED');
  if (request.now.getTime() < new Date(approval.issuedAt).getTime()) failures.push('APPROVAL_NOT_YET_VALID');
  if (request.cost) {
    if (compareMoney(request.cost, approval.costCeiling) > 0) failures.push('COST_CEILING_EXCEEDED');
  }
  return failures;
}

export function assertApprovalValid(approval: ApprovalBinding, request: ApprovalRequest): void {
  const failures = checkApproval(approval, request);
  if (failures.length > 0) {
    throw new LegalError('BLOCKED', 'Approval does not authorize this operation', {
      details: { reasons: failures, approvalId: approval.id },
    });
  }
}
