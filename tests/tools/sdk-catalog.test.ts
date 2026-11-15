import { describe, expect, it } from 'vitest';
import { LegalError } from '../../src/domain/errors.js';
import { LegalSdk } from '../../src/sdk/client.js';
import { LEGAL_TOOLS, getTool, parseToolInput } from '../../src/tools/catalog.js';
import { TENANT_A } from '../helpers/fixtures.js';

interface Call {
  url: string;
  method?: string;
  body?: string;
}

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  const impl = async (
    input: unknown,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => {
    calls.push({ url: String(input), method: init?.method, body: init?.body });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return impl as unknown as typeof fetch;
}

async function expectReason(
  run: () => Promise<unknown> | unknown,
  code: string,
  reason: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(LegalError);
    const legal = error as LegalError;
    expect(legal.code).toBe(code);
    expect(legal.details).toMatchObject({ reason });
    return;
  }
  throw new Error(`Expected ${code}/${reason}`);
}

describe('catálogo de herramientas', () => {
  it('no expone herramientas de aprobación, envío o administración', () => {
    const names = LEGAL_TOOLS.map((tool) => tool.name);
    expect(names).toHaveLength(7);
    for (const forbidden of ['approve', 'send', 'admin', 'sql', 'shell', 'http']) {
      expect(names.some((name) => name.includes(forbidden))).toBe(false);
    }
    expect(names).toContain('legal_matter_read');
  });

  it('rechaza herramientas desconocidas y campos extra como tenantId o actorId', () => {
    expect(() => getTool('legal_admin_sql')).toThrow(LegalError);

    for (const tool of LEGAL_TOOLS) {
      expect(() => parseToolInput(tool, { tenantId: TENANT_A })).toThrow(LegalError);
      expect(() => parseToolInput(tool, {})).toThrow(LegalError);
    }
  });

  it('valida la entrada de una herramienta conocida', () => {
    const tool = getTool('legal_matter_read');
    expect(parseToolInput(tool, { matterId: 'mat_1' })).toEqual({ matterId: 'mat_1' });
    expect(() => parseToolInput(tool, { matterId: 'mat_1', actorId: 'usr_x' })).toThrow(LegalError);
  });
});

describe('SDK', () => {
  it('rechaza rutas fuera de la allowlist sin llamar a la red', async () => {
    const calls: Call[] = [];
    const sdk = new LegalSdk({
      baseUrl: 'https://api.example.test',
      token: 'token',
      fetchImpl: fakeFetch(200, {}, calls),
    });

    await expectReason(
      () => sdk.request('/v1/legal/admin', { method: 'GET' }),
      'FORBIDDEN',
      'PATH_NOT_ALLOWED',
    );
    expect(calls).toHaveLength(0);
  });

  it('mapea errores del servidor a códigos de dominio', async () => {
    const sdk = new LegalSdk({
      baseUrl: 'https://api.example.test',
      token: 'token',
      fetchImpl: fakeFetch(424, { error: { message: 'Provider not verified' } }),
    });

    await expect(sdk.me()).rejects.toMatchObject({ code: 'CAPABILITY_NOT_VERIFIED' });
  });

  it('rellena parámetros de ruta y no los duplica en el cuerpo', async () => {
    const calls: Call[] = [];
    const sdk = new LegalSdk({
      baseUrl: 'https://api.example.test',
      token: 'token',
      fetchImpl: fakeFetch(200, { ok: true }, calls),
    });

    await sdk.callTool('legal_conflict_record', {
      matterId: 'mat_1',
      partyRefs: ['party_1'],
      representation: 'contraparte',
      result: 'clear',
    });

    expect(calls[0]?.url).toBe('https://api.example.test/v1/legal/matters/mat_1/conflicts');
    expect(calls[0]?.method).toBe('POST');
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body.matterId).toBeUndefined();
    expect(body.partyRefs).toEqual(['party_1']);
  });

  it('valida la entrada antes de enviar y exige HTTPS fuera de loopback', async () => {
    const calls: Call[] = [];
    const sdk = new LegalSdk({
      baseUrl: 'https://api.example.test',
      token: 'token',
      fetchImpl: fakeFetch(200, {}, calls),
    });

    expect(() => sdk.callTool('legal_conflict_record', { matterId: 'mat_1' })).toThrow(
      LegalError,
    );
    expect(calls).toHaveLength(0);

    expect(
      () => new LegalSdk({ baseUrl: 'http://api.example.test', token: 'token' }),
    ).toThrow(LegalError);
    expect(
      () => new LegalSdk({ baseUrl: 'http://localhost:3111', token: 'token' }),
    ).not.toThrow();
  });
});
