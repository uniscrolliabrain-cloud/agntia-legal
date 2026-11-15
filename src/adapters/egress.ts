import { isIP } from 'node:net';
import { LegalError } from '../domain/errors.js';

export interface DnsResolver {
  resolve(hostname: string): Promise<string[]>;
}

export const systemDnsResolver: DnsResolver = {
  async resolve(hostname: string): Promise<string[]> {
    const { lookup } = await import('node:dns/promises');
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
  },
};

function blockedIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a = 0, b = 0] = parts;
  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

/** True for any address an untrusted document or model must never reach. */
export function isBlockedAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isBlockedAddress(normalized.slice('::ffff:'.length));
  }
  const version = isIP(normalized);
  if (version === 4) return blockedIpv4(normalized);
  if (version === 6) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true; // link-local
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local
    if (normalized.startsWith('ff')) return true; // multicast
    return false;
  }
  return true; // not an IP literal
}

function blockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  );
}

/**
 * Validates a URL before any request is made: HTTPS only, default port, no
 * embedded credentials and no resolution to a private/link-local address.
 */
export async function assertSafeUrl(rawUrl: string, resolver: DnsResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new LegalError('INVALID_INPUT', 'Invalid outbound URL');
  }
  if (url.protocol !== 'https:') {
    throw new LegalError('FORBIDDEN', 'Only HTTPS outbound URLs are allowed', {
      details: { reason: 'PROTOCOL_NOT_ALLOWED', protocol: url.protocol },
    });
  }
  if (url.username || url.password) {
    throw new LegalError('FORBIDDEN', 'Credentials in URL are not allowed', {
      details: { reason: 'URL_CREDENTIALS' },
    });
  }
  if (url.port && url.port !== '443') {
    throw new LegalError('FORBIDDEN', 'Only the default HTTPS port is allowed', {
      details: { reason: 'PORT_NOT_ALLOWED', port: url.port },
    });
  }
  if (blockedHostname(url.hostname)) {
    throw new LegalError('FORBIDDEN', 'Outbound host is not allowed', {
      details: { reason: 'HOST_NOT_ALLOWED' },
    });
  }

  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal) !== 0) {
    if (isBlockedAddress(literal)) {
      throw new LegalError('FORBIDDEN', 'Private or link-local address blocked', {
        details: { reason: 'PRIVATE_ADDRESS_BLOCKED' },
      });
    }
    return url;
  }

  const addresses = await resolver.resolve(url.hostname);
  if (addresses.length === 0) {
    throw new LegalError('UPSTREAM_INVALID', 'Host did not resolve', {
      details: { reason: 'DNS_EMPTY' },
    });
  }
  if (addresses.some((address) => isBlockedAddress(address))) {
    throw new LegalError('FORBIDDEN', 'Host resolves to a private or link-local address', {
      details: { reason: 'PRIVATE_ADDRESS_BLOCKED' },
    });
  }
  return url;
}

export interface SafeFetchOptions {
  url: string;
  resolver: DnsResolver;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SafeFetchResult {
  status: number;
  url: string;
  contentType: string | null;
  body: string;
  redirects: string[];
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Backend-only fetch for external sources. Each redirect hop is revalidated:
 * an allowed host must not become an internal address after redirection.
 */
export async function safeFetchText(options: SafeFetchOptions): Promise<SafeFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? 2_000_000;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const redirects: string[] = [];
  let current = options.url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const url = await assertSafeUrl(current, options.resolver);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method ?? 'GET',
        ...(options.headers ? { headers: options.headers } : {}),
        ...(options.body ? { body: options.body } : {}),
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (error) {
      throw new LegalError('PROVIDER_UNAVAILABLE', 'Outbound request failed', {
        cause: error,
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new LegalError('UPSTREAM_INVALID', 'Redirect without Location header');
      }
      current = new URL(location, url).toString();
      redirects.push(current);
      continue;
    }

    const declared = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new LegalError('UPSTREAM_INVALID', 'Response exceeds the size limit', {
        details: { reason: 'RESPONSE_TOO_LARGE' },
      });
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new LegalError('UPSTREAM_INVALID', 'Response exceeds the size limit', {
        details: { reason: 'RESPONSE_TOO_LARGE' },
      });
    }

    return {
      status: response.status,
      url: url.toString(),
      contentType: response.headers.get('content-type'),
      body: new TextDecoder().decode(buffer),
      redirects,
    };
  }

  throw new LegalError('UPSTREAM_INVALID', 'Too many redirects', {
    details: { reason: 'TOO_MANY_REDIRECTS', maxRedirects },
  });
}
