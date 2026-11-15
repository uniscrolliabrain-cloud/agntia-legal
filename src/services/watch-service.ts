import { randomUUID } from 'node:crypto';
import type { SourceWatchProvider } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';
import { sha256HexSchema } from '../domain/ids.js';

export interface WatchSubscription {
  id: string;
  tenantId: string;
  topic: string;
  sourceRef: string;
  baselineHash: string;
  cadence: 'daily' | 'weekly';
  status: 'active' | 'paused';
  createdAt: string;
}

export interface WatchChange {
  id: string;
  tenantId: string;
  subscriptionId: string;
  sourceRef: string;
  previousHash: string;
  newHash: string;
  detectedAt: string;
  status: 'needs_review';
  summaryRef: string | null;
}

/**
 * Monitoring detects that a source changed; it never applies the change. The
 * same new hash is recorded once per subscription, so a retry is idempotent.
 */
export class WatchService {
  private readonly subscriptions: WatchSubscription[] = [];
  private readonly changes: WatchChange[] = [];

  constructor(private readonly provider: SourceWatchProvider) {}

  get providerStatus(): 'configured' | 'not_configured' {
    return this.provider.status;
  }

  subscribe(input: {
    tenantId: string;
    topic: string;
    sourceRef: string;
    baselineHash: string;
    cadence: 'daily' | 'weekly';
    now: Date;
  }): WatchSubscription {
    if (input.topic.trim().length === 0 || input.sourceRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A subscription needs a topic and a source');
    }
    if (!sha256HexSchema.safeParse(input.baselineHash).success) {
      throw new LegalError('INVALID_INPUT', 'A baseline sha256 hash is required');
    }

    const subscription: WatchSubscription = {
      id: `wat_${randomUUID()}`,
      tenantId: input.tenantId,
      topic: input.topic,
      sourceRef: input.sourceRef,
      baselineHash: input.baselineHash,
      cadence: input.cadence,
      status: 'active',
      createdAt: input.now.toISOString(),
    };
    this.subscriptions.push(subscription);
    return { ...subscription };
  }

  pause(tenantId: string, subscriptionId: string): WatchSubscription {
    const subscription = this.find(tenantId, subscriptionId);
    subscription.status = 'paused';
    return { ...subscription };
  }

  async poll(tenantId: string, subscriptionId: string, now: Date): Promise<WatchChange | null> {
    const subscription = this.find(tenantId, subscriptionId);
    if (subscription.status !== 'active') {
      return null;
    }

    const previous = this.changes
      .filter((change) => change.subscriptionId === subscription.id)
      .at(-1);
    const previousHash = previous?.newHash ?? subscription.baselineHash;

    const result = await this.provider.diff({
      tenantId,
      sourceRef: subscription.sourceRef,
      previousHash,
    });
    if (!result.changed) return null;
    if (!sha256HexSchema.safeParse(result.newHash).success) {
      throw new LegalError('UPSTREAM_INVALID', 'Provider returned an invalid change hash', {
        details: { reason: 'INVALID_CHANGE_HASH' },
      });
    }

    const replayed = this.changes.find(
      (change) =>
        change.subscriptionId === subscription.id && change.newHash === result.newHash,
    );
    if (replayed) return { ...replayed };

    const change: WatchChange = {
      id: `wch_${randomUUID()}`,
      tenantId,
      subscriptionId: subscription.id,
      sourceRef: subscription.sourceRef,
      previousHash,
      newHash: result.newHash,
      detectedAt: now.toISOString(),
      status: 'needs_review',
      summaryRef: result.summaryRef,
    };
    this.changes.push(change);
    return { ...change };
  }

  changesFor(tenantId: string): WatchChange[] {
    return this.changes.filter((change) => change.tenantId === tenantId).map((change) => ({ ...change }));
  }

  private find(tenantId: string, subscriptionId: string): WatchSubscription {
    const subscription = this.subscriptions.find(
      (candidate) => candidate.tenantId === tenantId && candidate.id === subscriptionId,
    );
    if (!subscription) {
      throw new LegalError('NOT_FOUND', 'Watch subscription not found', {
        details: { reason: 'SUBSCRIPTION_NOT_FOUND' },
      });
    }
    return subscription;
  }
}
