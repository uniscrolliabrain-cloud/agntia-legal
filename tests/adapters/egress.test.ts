import { describe, expect, it } from 'vitest';
import {
  assertSafeUrl,
  isBlockedAddress,
  safeFetchText,
  type DnsResolver,
} from '../../src/adapters/egress.js';
import { LegalError } from '../../src/domain/errors.js';

function resolver(addresses: string[]): DnsResolver {
  return { resolve: async () => addresses };
}

describe('address classification', () => {
  it('blocks private, loopback, link-local and multicast ranges', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.5.4',
      '192.168.1.10',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      'fe80::1',
      'fd00::1',
      '::ffff:10.0.0.1',
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it('allows public addresses', () => {
    expect(isBlockedAddress('93.184.216.34')).toBe(false);
    expect(isBlockedAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
  });
});

describe('safe URL validation', () => {
  it('accepts a public HTTPS URL', async () => {
    const url = await assertSafeUrl('https://example.test/feed', resolver(['93.184.216.34']));
    expect(url.hostname).toBe('example.test');
  });

  it('rejects plain HTTP', async () => {
    await expect(assertSafeUrl('http://example.test', resolver(['93.184.216.34']))).rejects.toBeInstanceOf(
      LegalError,
    );
  });

  it('rejects localhost names', async () => {
    await expect(assertSafeUrl('https://localhost/admin', resolver(['127.0.0.1']))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('rejects credentials embedded in the URL', async () => {
    await expect(
      assertSafeUrl('https://user:pass@example.test', resolver(['93.184.216.34'])),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects non-default ports', async () => {
    await expect(
      assertSafeUrl('https://example.test:8443/', resolver(['93.184.216.34'])),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects a name that resolves to a private address', async () => {
    await expect(
      assertSafeUrl('https://metadata.example.test/latest', resolver(['169.254.169.254'])),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects a literal private address without DNS', async () => {
    await expect(assertSafeUrl('https://10.0.0.5/', resolver([]))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('rejects a name that does not resolve', async () => {
    await expect(assertSafeUrl('https://empty.test/', resolver([]))).rejects.toMatchObject({
      code: 'UPSTREAM_INVALID',
    });
  });
});

describe('safe fetch', () => {
  it('revalidates every redirect hop', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(null, {
        status: 302,
        headers: { location: 'https://internal.example.test/secret' },
      });
    }) as unknown as typeof fetch;

    await expect(
      safeFetchText({
        url: 'https://public.example.test/feed',
        resolver: {
          resolve: async (hostname: string) =>
            hostname === 'public.example.test' ? ['93.184.216.34'] : ['10.0.0.7'],
        },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(calls).toBe(1);
  });

  it('enforces the response size limit', async () => {
    const fetchImpl = (async () => new Response('x'.repeat(100), { status: 200 })) as unknown as typeof fetch;
    await expect(
      safeFetchText({
        url: 'https://example.test/feed',
        resolver: resolver(['93.184.216.34']),
        fetchImpl,
        maxBytes: 10,
      }),
    ).rejects.toMatchObject({ code: 'UPSTREAM_INVALID' });
  });

  it('returns sanitized content for a valid response', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    const result = await safeFetchText({
      url: 'https://example.test/feed',
      resolver: resolver(['93.184.216.34']),
      fetchImpl,
    });
    expect(result.status).toBe(200);
    expect(result.contentType).toBe('application/json');
    expect(result.body).toContain('"ok":true');
  });
});
