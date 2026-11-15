import { describe, expect, it } from 'vitest';
import { createRedline, hashParagraphs, paragraphHash, type Paragraph } from '../../src/core/redline.js';
import { LegalError } from '../../src/domain/errors.js';
import { TENANT_A } from '../helpers/fixtures.js';

const now = new Date('2026-01-15T00:00:00.000Z');
const original: Paragraph[] = [
  { id: 'p1', text: 'Uno' },
  { id: 'p2', text: 'Dos' },
];

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT_A,
    version: 1,
    contractRevisionId: 'cr_1',
    baseHash: hashParagraphs(original),
    expectedVersion: 2,
    currentVersion: 2,
    original,
    editOps: [
      {
        op: 'replace' as const,
        paragraphId: 'p2',
        expectedTextHash: paragraphHash('Dos'),
        text: 'Dos bis',
      },
    ],
    now,
    ...overrides,
  };
}

describe('redline preview', () => {
  it('produces a semantic diff without mutating the original', () => {
    const redline = createRedline(baseInput());
    expect(redline.semanticDiff.modified).toEqual([
      { paragraphId: 'p2', before: 'Dos', after: 'Dos bis' },
    ]);
    expect(redline.semanticDiff.unchanged).toEqual(['p1']);
    expect(original.map((paragraph) => paragraph.text)).toEqual(['Uno', 'Dos']);
    expect(redline.redlineHash).toHaveLength(64);
  });

  it('supports insertions and deletions', () => {
    const redline = createRedline(
      baseInput({
        editOps: [
          { op: 'insert', paragraphId: 'p3', text: 'Tres', expectedTextHash: null },
          {
            op: 'delete',
            paragraphId: 'p1',
            expectedTextHash: paragraphHash('Uno'),
            text: null,
          },
        ],
      }),
    );
    expect(redline.semanticDiff.added).toEqual(['p3']);
    expect(redline.semanticDiff.removed).toEqual(['Uno']);
  });

  it('rejects a document whose base hash no longer matches', () => {
    expect(() => createRedline(baseInput({ baseHash: 'f'.repeat(64) }))).toThrowError(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
    try {
      createRedline(baseInput({ baseHash: 'f'.repeat(64) }));
    } catch (error) {
      expect((error as LegalError).details.reason).toBe('BASE_HASH_MISMATCH');
    }
  });

  it('rejects a concurrent change of the contract revision', () => {
    try {
      createRedline(baseInput({ currentVersion: 3 }));
    } catch (error) {
      expect((error as LegalError).details.reason).toBe('VERSION_CHANGED');
    }
  });

  it('fails an edit whose text precondition no longer holds', () => {
    try {
      createRedline(
        baseInput({
          editOps: [
            {
              op: 'replace',
              paragraphId: 'p2',
              expectedTextHash: paragraphHash('Otro texto'),
              text: 'Dos bis',
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as LegalError).details.reason).toBe('EDIT_PRECONDITION_FAILED');
    }
  });

  it('rejects an edit on a paragraph that is not in the base', () => {
    expect(() =>
      createRedline(
        baseInput({
          editOps: [{ op: 'delete', paragraphId: 'p9', text: null, expectedTextHash: null }],
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
