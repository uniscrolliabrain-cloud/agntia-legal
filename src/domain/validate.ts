import type { z } from 'zod';
import { LegalError } from './errors.js';

/**
 * Parses with a zod schema and converts failures into a safe INVALID_INPUT
 * error: paths and codes only, never the offending value (which may be PII).
 */
export function parseStrict<S extends z.ZodTypeAny>(
  schema: S,
  value: unknown,
  label: string,
): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new LegalError('INVALID_INPUT', `Invalid ${label}`, {
      details: {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
        })),
      },
    });
  }
  return result.data;
}
