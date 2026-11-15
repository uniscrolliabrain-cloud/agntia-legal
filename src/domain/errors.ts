export type LegalErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'NOT_SUPPORTED'
  | 'BLOCKED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'CAPABILITY_NOT_VERIFIED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_INVALID'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INTERNAL';

const HTTP_STATUS: Record<LegalErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NOT_SUPPORTED: 422,
  BLOCKED: 409,
  DEPENDENCY_UNAVAILABLE: 424,
  CAPABILITY_NOT_VERIFIED: 424,
  RATE_LIMITED: 429,
  UPSTREAM_INVALID: 502,
  PROVIDER_UNAVAILABLE: 503,
  TIMEOUT: 504,
  INTERNAL: 500,
};

export interface LegalErrorOptions {
  /** Safe, non-sensitive structured context. Never include payloads or secrets. */
  details?: Record<string, unknown>;
  retryable?: boolean;
  reconciliationRequired?: boolean;
  cause?: unknown;
}

/**
 * Domain error. `message` is safe to return to a client: no tracebacks, PII or
 * secret material. An uncertain outcome is a TIMEOUT/outcome_unknown, never a
 * definitive failure that invites a blind retry.
 */
export class LegalError extends Error {
  readonly code: LegalErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly reconciliationRequired: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: LegalErrorCode, message: string, options: LegalErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'LegalError';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.retryable = options.retryable ?? false;
    this.reconciliationRequired =
      options.reconciliationRequired ?? (code === 'TIMEOUT' || code === 'PROVIDER_UNAVAILABLE');
    this.details = options.details ?? {};
  }
}

export function isLegalError(value: unknown): value is LegalError {
  return value instanceof LegalError;
}

export function toLegalError(value: unknown): LegalError {
  if (isLegalError(value)) return value;
  return new LegalError('INTERNAL', 'Unexpected internal error', { cause: value });
}
