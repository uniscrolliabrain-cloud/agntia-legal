import { LegalError } from '../domain/errors.js';

export interface DraftField {
  value: string;
  /** Every value must point to its source; unknown data is not invented. */
  evidenceRef: string | null;
}

export interface DraftInput {
  templateId: string;
  requiredFields: readonly string[];
  fields: Readonly<Record<string, DraftField>>;
}

export interface DraftResult {
  templateId: string;
  status: 'blocked' | 'proposed';
  missing: string[];
  unsupported: string[];
  values: Record<string, string>;
  reasons: string[];
}

/**
 * Draft generation only copies evidenced values. A missing or unsupported
 * required field blocks the draft; the model never completes a blank with a
 * plausible number, party or date.
 */
export function proposeDraft(input: DraftInput): DraftResult {
  if (input.templateId.trim().length === 0) {
    throw new LegalError('INVALID_INPUT', 'A draft needs a template reference');
  }
  if (input.requiredFields.length === 0) {
    throw new LegalError('INVALID_INPUT', 'A draft template needs required fields');
  }

  const missing = input.requiredFields.filter((field) => {
    const entry = input.fields[field];
    return !entry || entry.value.trim().length === 0 || !entry.evidenceRef;
  });

  const unsupported = Object.entries(input.fields)
    .filter(([, entry]) => entry.value.trim().length > 0 && !entry.evidenceRef)
    .map(([field]) => field);

  const values: Record<string, string> = {};
  for (const [field, entry] of Object.entries(input.fields)) {
    if (entry.value.trim().length > 0 && entry.evidenceRef) {
      values[field] = entry.value;
    }
  }

  const reasons: string[] = [];
  for (const field of missing) reasons.push(`MISSING_EVIDENCED_FIELD:${field}`);
  for (const field of unsupported) reasons.push(`UNSUPPORTED_VALUE:${field}`);

  return {
    templateId: input.templateId,
    status: reasons.length === 0 ? 'proposed' : 'blocked',
    missing,
    unsupported,
    values,
    reasons,
  };
}
