import { randomUUID } from 'node:crypto';
import type { AnamProvider, PresenceSession } from '../adapters/external.js';
import { LegalError } from '../domain/errors.js';

export interface PortalThread {
  id: string;
  tenantId: string;
  subjectRef: string;
  status: 'open' | 'handoff_requested' | 'closed';
  createdAt: string;
}

export interface PortalMessage {
  id: string;
  tenantId: string;
  threadId: string;
  authorRole: 'client' | 'staff';
  authorRef: string;
  /** Client content is stored by reference; the service keeps no raw PII. */
  bodyRef: string;
  createdAt: string;
}

/**
 * Portal backend contract. Messages are authored by a client or a staff member;
 * there is deliberately no `system` author, so the product never presents model
 * output as legal advice inside the thread. Presence (Anam) is optional and
 * fails closed when not configured.
 */
export class PortalService {
  private readonly threads = new Map<string, PortalThread>();
  private readonly messages: PortalMessage[] = [];

  constructor(private readonly anam: AnamProvider) {}

  get presenceStatus(): 'configured' | 'not_configured' {
    return this.anam.status;
  }

  openThread(input: { tenantId: string; subjectRef: string }, now: Date): PortalThread {
    if (input.subjectRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'A subject reference is required');
    }
    const thread: PortalThread = {
      id: `thr_${randomUUID()}`,
      tenantId: input.tenantId,
      subjectRef: input.subjectRef,
      status: 'open',
      createdAt: now.toISOString(),
    };
    this.threads.set(`${input.tenantId}:${thread.id}`, thread);
    return { ...thread };
  }

  postMessage(
    input: {
      tenantId: string;
      threadId: string;
      authorRole: 'client' | 'staff';
      authorRef: string;
      bodyRef: string;
    },
    now: Date,
  ): PortalMessage {
    const thread = this.load(input.tenantId, input.threadId);
    if (thread.status === 'closed') {
      throw new LegalError('BLOCKED', 'Thread is closed', { details: { reason: 'THREAD_CLOSED' } });
    }
    if (input.authorRole !== 'client' && input.authorRole !== 'staff') {
      throw new LegalError('FORBIDDEN', 'Only a client or staff member can post', {
        details: { reason: 'AUTHOR_ROLE_NOT_ALLOWED' },
      });
    }
    if (input.authorRef.trim().length === 0 || input.bodyRef.trim().length === 0) {
      throw new LegalError('INVALID_INPUT', 'Message needs an author and a body reference');
    }

    const message: PortalMessage = {
      id: `msg_${randomUUID()}`,
      tenantId: input.tenantId,
      threadId: thread.id,
      authorRole: input.authorRole,
      authorRef: input.authorRef,
      bodyRef: input.bodyRef,
      createdAt: now.toISOString(),
    };
    this.messages.push(message);
    return { ...message };
  }

  requestHumanHandoff(tenantId: string, threadId: string, now: Date): PortalThread {
    const thread = this.load(tenantId, threadId);
    if (thread.status === 'closed') {
      throw new LegalError('BLOCKED', 'Thread is closed', { details: { reason: 'THREAD_CLOSED' } });
    }
    thread.status = 'handoff_requested';
    void now;
    return { ...thread };
  }

  close(tenantId: string, threadId: string): PortalThread {
    const thread = this.load(tenantId, threadId);
    thread.status = 'closed';
    return { ...thread };
  }

  messagesFor(tenantId: string, threadId: string): PortalMessage[] {
    return this.messages
      .filter((message) => message.tenantId === tenantId && message.threadId === threadId)
      .map((message) => ({ ...message }));
  }

  async startPresence(
    tenantId: string,
    threadId: string,
    subjectRef: string,
  ): Promise<PresenceSession> {
    this.load(tenantId, threadId);
    return this.anam.createSession({ tenantId, threadId, subjectRef });
  }

  private load(tenantId: string, threadId: string): PortalThread {
    const thread = this.threads.get(`${tenantId}:${threadId}`);
    if (!thread) {
      throw new LegalError('NOT_FOUND', 'Portal thread not found', {
        details: { reason: 'THREAD_NOT_FOUND' },
      });
    }
    return thread;
  }
}
