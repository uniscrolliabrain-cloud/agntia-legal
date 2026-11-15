import type {
  EffectProvider,
  ProviderReceipt,
  ProviderRequest,
} from '../core/ports.js';
import { ProviderTimeoutError } from '../core/ports.js';

/**
 * Default deployment provider. It is explicitly not configured, so every
 * effect-capable operation is disabled instead of being simulated as success.
 */
export class NotConfiguredProvider implements EffectProvider {
  readonly id = 'not_configured';
  readonly status = 'not_configured' as const;

  async execute(): Promise<ProviderReceipt> {
    throw new ProviderTimeoutError('No provider is configured; nothing was submitted');
  }

  async lookup(): Promise<ProviderReceipt | null> {
    return null;
  }
}

export interface ScriptedProviderOptions {
  /** Simulates the provider accepting the effect and the response being lost. */
  timeoutAfterSubmit?: boolean;
  /** Marks the receipt as verified (effect confirmed) or accepted only. */
  verified?: boolean;
  providerRef?: string;
}

/**
 * Test double. It is marked `configured` only because a test drives it, and it
 * is never wired into a deployment: a mock passing does not prove a provider.
 */
export class ScriptedProvider implements EffectProvider {
  readonly id = 'scripted-test-provider';
  readonly status = 'configured' as const;
  readonly effects: ProviderRequest[] = [];

  constructor(private readonly options: ScriptedProviderOptions = {}) {}

  async execute(request: ProviderRequest): Promise<ProviderReceipt> {
    this.effects.push(request);
    if (this.options.timeoutAfterSubmit) {
      throw new ProviderTimeoutError();
    }
    return {
      providerRef: this.options.providerRef ?? `remote_${request.idempotencyKey}`,
      acceptedAt: new Date().toISOString(),
      verified: this.options.verified ?? true,
    };
  }

  async lookup(request: { tenantId: string; idempotencyKey: string }): Promise<ProviderReceipt | null> {
    const found = this.effects.find(
      (effect) =>
        effect.tenantId === request.tenantId && effect.idempotencyKey === request.idempotencyKey,
    );
    if (!found) return null;
    return {
      providerRef: this.options.providerRef ?? `remote_${found.idempotencyKey}`,
      acceptedAt: new Date().toISOString(),
      verified: this.options.verified ?? true,
    };
  }
}
