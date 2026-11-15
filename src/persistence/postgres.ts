import { LegalError } from '../domain/errors.js';

export interface PostgresConfig {
  /** Reference into a secret store; a connection string with a password is rejected. */
  connectionRef: string;
  schema: string;
  poolSize: number;
  statementTimeoutMs: number;
}

/**
 * The production persistence target is Postgres with the SQL in `db/migrations`
 * (executed in tests via PGlite). This module is an explicit stub: it refuses to
 * pretend a database exists. Wiring a real driver requires its own review,
 * migrations against an isolated project and the RLS A/B tests.
 */
export function createPostgresRepositories(config: PostgresConfig): never {
  if (!/^(vault|doppler|aws-sm|gcp-sm|ref):/.test(config.connectionRef)) {
    throw new LegalError('INVALID_INPUT', 'A connection reference is required', {
      details: { reason: 'CONNECTION_REFERENCE_REQUIRED' },
    });
  }
  throw new LegalError('DEPENDENCY_UNAVAILABLE', 'Postgres adapter is not available in this build', {
    details: {
      reason: 'POSTGRES_DRIVER_NOT_INSTALLED',
      migrations: 'db/migrations/0001_init.sql, db/migrations/0002_rls.sql',
      verification: 'PGlite only; real Postgres NOT_VERIFIED',
    },
  });
}

export const POSTGRES_STUB_NOTES = [
  'Repositorios en memoria son la implementación de referencia local.',
  'SQL y RLS se ejecutan en PGlite; un Postgres real sigue NOT_VERIFIED.',
  'No hay driver, pool, reintentos ni migrador automático en esta entrega.',
] as const;
