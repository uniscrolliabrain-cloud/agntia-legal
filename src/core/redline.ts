import { randomUUID } from 'node:crypto';
import type { EditOp, Redline } from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import { hashJson, sha256Hex } from './hash.js';

export interface Paragraph {
  id: string;
  text: string;
}

export interface CreateRedlineInput {
  id?: string;
  tenantId: string;
  version: number;
  contractRevisionId: string;
  /** Hash of the original paragraphs, recorded when the revision was read. */
  baseHash: string;
  expectedVersion: number;
  currentVersion: number;
  original: readonly Paragraph[];
  editOps: readonly EditOp[];
  now: Date;
}

export function paragraphHash(text: string): string {
  return sha256Hex(text);
}

export function hashParagraphs(paragraphs: readonly Paragraph[]): string {
  return hashJson(paragraphs.map((paragraph) => ({ id: paragraph.id, text: paragraph.text })));
}

/**
 * Produces a reviewable redline without mutating the original document.
 *
 * - The recorded base hash must still match the original: otherwise the
 *   approved base changed and the diff is invalid.
 * - Optimistic concurrency: expectedVersion must equal the current version.
 * - Each replace/delete can carry a text precondition; a mismatch is a
 *   conflict, not a silent overwrite.
 */
export function createRedline(input: CreateRedlineInput): Redline {
  if (input.expectedVersion !== input.currentVersion) {
    throw new LegalError('CONFLICT', 'Contract revision changed since the redline was prepared', {
      details: { reason: 'VERSION_CHANGED', expectedVersion: input.expectedVersion, currentVersion: input.currentVersion },
    });
  }

  const originalHash = hashParagraphs(input.original);
  if (originalHash !== input.baseHash) {
    throw new LegalError('CONFLICT', 'Original document does not match the approved base', {
      details: { reason: 'BASE_HASH_MISMATCH', originalHash },
    });
  }

  const working = input.original.map((paragraph) => ({ ...paragraph }));
  const indexById = new Map<string, number>();
  working.forEach((paragraph, index) => {
    if (indexById.has(paragraph.id)) {
      throw new LegalError('INVALID_INPUT', 'Duplicate paragraph identifier', {
        details: { paragraphId: paragraph.id },
      });
    }
    indexById.set(paragraph.id, index);
  });

  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ paragraphId: string; before: string; after: string }> = [];
  const touched = new Set<string>();

  for (const op of input.editOps) {
    if (op.op === 'insert') {
      if (indexById.has(op.paragraphId)) {
        throw new LegalError('CONFLICT', 'Inserted paragraph id already exists', {
          details: { reason: 'PARAGRAPH_ID_EXISTS', paragraphId: op.paragraphId },
        });
      }
      if (op.text === null) {
        throw new LegalError('INVALID_INPUT', 'Insert requires text', {
          details: { paragraphId: op.paragraphId },
        });
      }
      indexById.set(op.paragraphId, working.length);
      working.push({ id: op.paragraphId, text: op.text });
      added.push(op.paragraphId);
      touched.add(op.paragraphId);
      continue;
    }

    const index = indexById.get(op.paragraphId);
    if (index === undefined) {
      throw new LegalError('INVALID_INPUT', 'Paragraph not found in the base document', {
        details: { paragraphId: op.paragraphId },
      });
    }
    const current = working[index];
    if (!current) {
      throw new LegalError('INTERNAL', 'Paragraph index inconsistent');
    }
    if (op.expectedTextHash && paragraphHash(current.text) !== op.expectedTextHash) {
      throw new LegalError('CONFLICT', 'Paragraph changed since the edit was prepared', {
        details: { reason: 'EDIT_PRECONDITION_FAILED', paragraphId: op.paragraphId },
      });
    }

    if (op.op === 'replace') {
      if (op.text === null) {
        throw new LegalError('INVALID_INPUT', 'Replace requires text', {
          details: { paragraphId: op.paragraphId },
        });
      }
      modified.push({ paragraphId: op.paragraphId, before: current.text, after: op.text });
      working[index] = { id: current.id, text: op.text };
      touched.add(op.paragraphId);
    } else {
      removed.push(current.text);
      working.splice(index, 1);
      indexById.delete(op.paragraphId);
      for (const [id, position] of indexById) {
        if (position > index) indexById.set(id, position - 1);
      }
      touched.add(op.paragraphId);
    }
  }

  // Defensive: the caller's array must be untouched by construction.
  if (hashParagraphs(input.original) !== input.baseHash) {
    throw new LegalError('INTERNAL', 'Original document was mutated during redline creation');
  }

  const semanticDiff = {
    added,
    removed,
    modified,
    unchanged: working.filter((paragraph) => !touched.has(paragraph.id)).map((paragraph) => paragraph.id),
  };

  const redlineHash = hashJson({
    baseHash: input.baseHash,
    editOps: input.editOps,
    result: working,
    expectedVersion: input.expectedVersion,
  });

  return {
    id: input.id ?? `rdl_${randomUUID()}`,
    tenantId: input.tenantId,
    version: input.version,
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
    contractRevisionId: input.contractRevisionId,
    baseHash: input.baseHash,
    editOps: [...input.editOps],
    semanticDiff,
    expectedVersion: input.expectedVersion,
    redlineHash,
  };
}
