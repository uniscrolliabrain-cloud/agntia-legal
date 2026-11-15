import { createHash } from 'node:crypto';

function walk(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'boolean') return value === true ? 'true' : 'false';
  if (type === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError('canonicalize: non-finite number');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('canonicalize: circular structure');
    seen.add(value);
    const body = value.map((entry) => walk(entry, seen)).join(',');
    seen.delete(value);
    return `[${body}]`;
  }
  if (type === 'object') {
    const record = value as Record<string, unknown>;
    if (seen.has(record)) throw new TypeError('canonicalize: circular structure');
    seen.add(record);
    const entries = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${walk(record[key], seen)}`);
    seen.delete(record);
    return `{${entries.join(',')}}`;
  }
  // undefined, function, symbol, bigint are not valid hashable domain data.
  throw new TypeError(`canonicalize: unsupported value of type ${type}`);
}

/** Stable JSON with sorted keys: equal material always yields the same bytes. */
export function canonicalize(value: unknown): string {
  return walk(value, new WeakSet<object>());
}

export function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashJson(value: unknown): string {
  return sha256Hex(canonicalize(value));
}
