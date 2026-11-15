import { LegalError, type LegalErrorCode } from '../domain/errors.js';
import { getTool, parseToolInput } from '../tools/catalog.js';

const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/health$/,
  /^\/v1\/legal\/me$/,
  /^\/v1\/legal\/matters$/,
  /^\/v1\/legal\/matters\/[A-Za-z0-9:_.-]+$/,
  /^\/v1\/legal\/matters\/[A-Za-z0-9:_.-]+\/transitions$/,
  /^\/v1\/legal\/matters\/[A-Za-z0-9:_.-]+\/conflicts$/,
  /^\/v1\/legal\/citations\/verify$/,
  /^\/v1\/legal\/deadlines\/propose$/,
  /^\/v1\/legal\/redlines\/preview$/,
  /^\/v1\/legal\/intents$/,
  /^\/v1\/legal\/intents\/[A-Za-z0-9:_.-]+\/reconcile$/,
  /^\/v1\/legal\/integrations\/[A-Za-z0-9:_.-]+\/capabilities$/,
  /^\/v1\/legal\/reports$/,
  /^\/v1\/legal\/reports\/[A-Za-z0-9:_.-]+$/,
];

const STATUS_TO_CODE: Record<number, LegalErrorCode> = {
  400: 'INVALID_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'INVALID_INPUT',
  422: 'NOT_SUPPORTED',
  424: 'CAPABILITY_NOT_VERIFIED',
  429: 'RATE_LIMITED',
  502: 'UPSTREAM_INVALID',
  503: 'PROVIDER_UNAVAILABLE',
  504: 'TIMEOUT',
};

export interface LegalSdkOptions {
  baseUrl: string;
  /** Caller-provided Supabase JWT. The SDK never mints identities. */
  token: string;
  fetchImpl?: typeof fetch;
}

/**
 * Server-side SDK. Every request must match the exact allowlist; there is no
 * generic "call any URL" method and no tenant/actor parameter.
 */
export class LegalSdk {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: LegalSdkOptions) {
    const url = new URL(options.baseUrl);
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !loopback) {
      throw new LegalError('INVALID_INPUT', 'SDK base URL must use HTTPS', {
        details: { reason: 'INSECURE_BASE_URL' },
      });
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
    if (!ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
      throw new LegalError('FORBIDDEN', 'Path is not allowed by the SDK', {
        details: { reason: 'PATH_NOT_ALLOWED' },
      });
    }

    const response = await this.fetchImpl(`${this.options.baseUrl.replace(/\/$/, '')}${path}`, {
      method: init.method,
      headers: {
        authorization: `Bearer ${this.options.token}`,
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        'x-correlation-id': `sdk_${Date.now()}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    if (!response.ok) {
      let message = 'Request failed';
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // Non-JSON error body: keep the generic message, never echo raw content.
      }
      throw new LegalError(STATUS_TO_CODE[response.status] ?? 'INTERNAL', message, {
        details: { status: response.status },
      });
    }

    return (await response.json()) as T;
  }

  me(): Promise<unknown> {
    return this.request('/v1/legal/me', { method: 'GET' });
  }

  /**
   * Invokes a catalog tool. Input is validated against the tool schema, so a
   * caller cannot smuggle tenantId, actorId or unknown fields.
   */
  callTool<T>(name: string, input: unknown): Promise<T> {
    const tool = getTool(name);
    const parsed = parseToolInput(tool, input) as Record<string, unknown>;

    const pathParams = [...tool.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '');
    const path = tool.path.replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = parsed[key];
      if (value === undefined) {
        throw new LegalError('INVALID_INPUT', `Missing path parameter ${key}`);
      }
      return encodeURIComponent(String(value));
    });

    if (tool.method === 'GET') {
      return this.request<T>(path, { method: 'GET' });
    }

    const body: Record<string, unknown> = { ...parsed };
    for (const key of pathParams) delete body[key];
    return this.request<T>(path, { method: 'POST', body });
  }

  matterRead<T>(matterId: string): Promise<T> {
    return this.callTool<T>('legal_matter_read', { matterId });
  }

  matterIntake<T>(input: unknown): Promise<T> {
    return this.callTool<T>('legal_matter_intake', input);
  }

  citationVerify<T>(input: unknown): Promise<T> {
    return this.callTool<T>('legal_citation_verify', input);
  }

  deadlinePropose<T>(input: unknown): Promise<T> {
    return this.callTool<T>('legal_deadline_propose', input);
  }

  redlinePreview<T>(input: unknown): Promise<T> {
    return this.callTool<T>('legal_redline_preview', input);
  }

  reportCreate<T>(input: unknown): Promise<T> {
    return this.callTool<T>('legal_report_create', input);
  }
}
