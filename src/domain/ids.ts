import { z } from 'zod';

/**
 * IDs are opaque strings owned by this service unless an explicit native
 * mapping is declared. They are never UUID-forced and never parsed.
 */
export const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9:_.-]*$/, 'opaque identifier');

export type OpaqueId = z.infer<typeof opaqueIdSchema>;

/** ISO-8601 date-time with an explicit offset. Naive local times are rejected. */
export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: 'datetime with offset required' });

/** Calendar date (YYYY-MM-DD) used for effective dates and territorial law. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'invalid calendar date');

export const sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'sha256 hex required');

/**
 * Money is a decimal string plus currency and exponent. Floats are never used
 * for monetary commitments.
 */
export const moneySchema = z
  .object({
    amount: z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal string required'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'ISO-4217 currency required'),
    exponent: z.number().int().min(0).max(8),
  })
  .strict();

export type Money = z.infer<typeof moneySchema>;
