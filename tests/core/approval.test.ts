import { describe, expect, it } from 'vitest';
import {
  assertApprovalValid,
  checkApproval,
  compareMoney,
  type ApprovalRequest,
} from '../../src/domain/approval.js';
import { LegalError } from '../../src/domain/errors.js';
import { approvalFor, eur, PAYLOAD_HASH, POLICY_HASH, TENANT_A } from '../helpers/fixtures.js';

function request(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    tenantId: TENANT_A,
    resourceId: 'fil_1',
    resourceVersion: 3,
    payloadHash: PAYLOAD_HASH,
    recipient: 'registro@example.test',
    channel: 'filing-gateway',
    scope: 'present-draft',
    policyHash: POLICY_HASH,
    now: new Date('2026-01-15T00:00:00.000Z'),
    revocationVersion: 0,
    ...overrides,
  };
}

describe('approval binding', () => {
  it('authorizes the exact material it was issued for', () => {
    const approval = approvalFor();
    expect(checkApproval(approval, request())).toEqual([]);
    expect(() => assertApprovalValid(approval, request())).not.toThrow();
  });

  it('is invalidated when the payload changes', () => {
    const approval = approvalFor();
    const failures = checkApproval(approval, request({ payloadHash: 'a'.repeat(64) }));
    expect(failures).toContain('PAYLOAD_CHANGED');
  });

  it('is invalidated when the resource version changes', () => {
    const failures = checkApproval(approvalFor(), request({ resourceVersion: 4 }));
    expect(failures).toContain('VERSION_CHANGED');
  });

  it('is invalidated when the recipient or channel changes', () => {
    const failures = checkApproval(
      approvalFor(),
      request({ recipient: 'otro@example.test', channel: 'email' }),
    );
    expect(failures).toContain('RECIPIENT_CHANGED');
    expect(failures).toContain('CHANNEL_CHANGED');
  });

  it('expires', () => {
    const failures = checkApproval(
      approvalFor(),
      request({ now: new Date('2026-03-01T00:00:00.000Z') }),
    );
    expect(failures).toContain('APPROVAL_EXPIRED');
  });

  it('respects revocation', () => {
    const revoked = { ...approvalFor(), revokedAt: '2026-01-10T00:00:00.000Z' };
    expect(checkApproval(revoked, request())).toContain('APPROVAL_REVOKED');
  });

  it('detects a tampered approval hash', () => {
    const approval = approvalFor();
    const tampered = { ...approval, approvalHash: 'b'.repeat(64) };
    expect(checkApproval(tampered, request())).toContain('APPROVAL_HASH_MISMATCH');
  });

  it('enforces the cost ceiling', () => {
    const approval = approvalFor({ costCeiling: eur('10.00') });
    expect(checkApproval(approval, request({ cost: eur('10.00') }))).toEqual([]);
    expect(checkApproval(approval, request({ cost: eur('10.01') }))).toContain(
      'COST_CEILING_EXCEEDED',
    );
  });

  it('compares decimal money without floating point', () => {
    expect(compareMoney(eur('0.10'), eur('0.10'))).toBe(0);
    expect(compareMoney(eur('0.10'), eur('0.2'))).toBe(-1);
    expect(compareMoney(eur('12345678901234567890.01'), eur('12345678901234567890.02'))).toBe(-1);
  });

  it('rejects an approval window that is not positive', () => {
    expect(() =>
      approvalFor({ expiresAt: '2025-12-31T00:00:00.000Z' }),
    ).toThrow(LegalError);
  });
});
