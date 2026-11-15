import { describe, expect, it } from 'vitest';
import {
  assertCapability,
  buildCapabilityReport,
  publicCapabilities,
  stateFor,
} from '../../src/adapters/capability.js';
import { LegalError } from '../../src/domain/errors.js';

const now = new Date('2026-11-14T00:00:00.000Z');

const report = buildCapabilityReport({
  integrationId: 'int_opencontracts',
  tenantId: 'tnt_alpha',
  deployment: 'self-hosted',
  edition: 'community',
  version: '0.1.0',
  generatedAt: '2026-11-13T00:00:00.000Z',
  entries: [
    {
      operation: 'legal.document.stage',
      state: 'verified_runtime',
      fields: ['documentId', 'sourceHash'],
      verifiedAt: '2026-11-13T00:00:00.000Z',
      expiresAt: '2026-12-13T00:00:00.000Z',
      evidenceRef: 'evd_1',
    },
    { operation: 'legal.extract.preview', state: 'documented', fields: ['pageRefs'] },
    { operation: 'legal.redline.preview', state: 'not_configured', fields: [] },
  ],
});

describe('capability reports', () => {
  it('accepts a verified and fresh capability', () => {
    const entry = assertCapability(report, 'legal.document.stage', now);
    expect(entry.state).toBe('verified_runtime');
  });

  it('disables documented, unknown and not_configured capabilities', () => {
    for (const operation of ['legal.extract.preview', 'legal.redline.preview', 'legal.unknown.op']) {
      try {
        assertCapability(report, operation, now);
        throw new Error('expected a block');
      } catch (error) {
        expect(error).toBeInstanceOf(LegalError);
        expect((error as LegalError).code).toBe('CAPABILITY_NOT_VERIFIED');
      }
    }
    expect(stateFor(report, 'legal.extract.preview')).toBe('documented');
    expect(stateFor(report, 'legal.not.listed')).toBe('unknown');
  });

  it('expires capability evidence', () => {
    expect(() =>
      assertCapability(report, 'legal.document.stage', new Date('2027-01-01T00:00:00.000Z')),
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_NOT_VERIFIED' }));
  });

  it('never exposes secret references publicly', () => {
    const publicView = publicCapabilities(report);
    const serialized = JSON.stringify(publicView);
    expect(serialized).not.toContain('evidenceRef');
    expect(serialized).not.toContain('expiresAt');
    expect(publicView[0]).toEqual({
      operation: 'legal.document.stage',
      state: 'verified_runtime',
      fields: ['documentId', 'sourceHash'],
    });
  });
});
