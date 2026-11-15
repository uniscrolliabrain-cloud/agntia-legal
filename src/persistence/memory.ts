import type { IntentRecord, IntentRepository, Repository, ScopeAware } from '../core/ports.js';
import { LegalError } from '../domain/errors.js';

function keyOf(tenantId: string, id: string): string {
  return `${tenantId}::${id}`;
}

/**
 * Reference implementation of the repository port. It is intentionally strict
 * about tenancy and optimistic concurrency so tests exercise the same contract
 * the SQL adapter must satisfy.
 */
export class InMemoryRepository<T extends ScopeAware> implements Repository<T> {
  private readonly store = new Map<string, T>();

  protected entries(): T[] {
    return [...this.store.values()].map((record) => structuredClone(record));
  }

  async get(tenantId: string, id: string): Promise<T | null> {
    const record = this.store.get(keyOf(tenantId, id));
    if (!record || record.tenantId !== tenantId) return null;
    return structuredClone(record);
  }

  async list(tenantId: string): Promise<T[]> {
    return this.entries().filter((record) => record.tenantId === tenantId);
  }

  async create(record: T): Promise<T> {
    const key = keyOf(record.tenantId, record.id);
    if (this.store.has(key)) {
      throw new LegalError('CONFLICT', 'Record already exists', {
        details: { reason: 'RECORD_EXISTS', id: record.id },
      });
    }
    this.store.set(key, structuredClone(record));
    return structuredClone(record);
  }

  async update(record: T, expectedVersion: number): Promise<T> {
    const key = keyOf(record.tenantId, record.id);
    const current = this.store.get(key);
    if (!current) {
      throw new LegalError('NOT_FOUND', 'Record not found', {
        details: { reason: 'RECORD_NOT_FOUND', id: record.id },
      });
    }
    if (current.version !== expectedVersion) {
      throw new LegalError('CONFLICT', 'Record version changed', {
        details: { reason: 'VERSION_CONFLICT', expectedVersion, currentVersion: current.version },
      });
    }
    this.store.set(key, structuredClone(record));
    return structuredClone(record);
  }
}

export class InMemoryIntentRepository
  extends InMemoryRepository<IntentRecord>
  implements IntentRepository
{
  async findByKey(
    tenantId: string,
    capability: string,
    idempotencyKey: string,
  ): Promise<IntentRecord | null> {
    const match = this.entries().find(
      (record) =>
        record.tenantId === tenantId &&
        record.capability === capability &&
        record.idempotencyKey === idempotencyKey,
    );
    return match ?? null;
  }
}
