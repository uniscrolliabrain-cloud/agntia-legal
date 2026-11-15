import { describe, expect, it } from 'vitest';
import { ScriptedProvider } from '../../src/adapters/provider.js';
import { InMemoryCitationResolver, InMemoryLawSnapshots } from '../../src/adapters/sources.js';
import { createRuntime } from '../../src/container.js';
import { hashJson } from '../../src/core/hash.js';
import { hashParagraphs, paragraphHash } from '../../src/core/redline.js';
import { LegalError } from '../../src/domain/errors.js';
import { approvalFor, makePrincipal, POLICY_HASH, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-01-15T00:00:00.000Z');

const principalA = makePrincipal({ userId: 'a', roles: ['owner'] });
const principalB = makePrincipal({ userId: 'b', tenantId: TENANT_B, roles: ['owner'] });

const provider = new ScriptedProvider({ verified: true });
const citationResolver = new InMemoryCitationResolver({
  'Ley 1/2020': {
    kind: 'legislation',
    authorityRef: 'BOE-A-2020-1',
    officialRef: 'BOE-A-2020-1',
    jurisdiction: 'ES',
  },
});

const runtime = createRuntime({
  resolvePrincipal: async (token: string) => {
    if (token === 'a') return principalA;
    if (token === 'b') return principalB;
    throw new LegalError('UNAUTHENTICATED', 'invalid token');
  },
  provider,
  citation: {
    resolver: citationResolver,
    snapshots: new InMemoryLawSnapshots([
      {
        authorityRef: 'BOE-A-2020-1',
        jurisdiction: 'ES',
        sourceHash: 'a'.repeat(64),
        versionDate: '2020-01-01',
        effectiveFrom: '2020-01-02',
        effectiveTo: null,
        consolidationStatus: 'consolidated',
        fragment: 'Articulo 1. Objeto.',
      },
    ]),
  },
  now: () => NOW,
});

async function post(path: string, body: unknown, token = 'a'): Promise<Response> {
  return runtime.app.request(path, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(path: string, token = 'a'): Promise<Response> {
  return runtime.app.request(path, { headers: { authorization: `Bearer ${token}` } });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

interface Matter {
  id: string;
  version: number;
  state: string;
  tenantId: string;
}

async function transition(
  matter: Matter,
  to: string,
  context: Record<string, unknown> = {},
): Promise<Matter> {
  const response = await post(`/v1/legal/matters/${matter.id}/transitions`, {
    to,
    expectedVersion: matter.version,
    ...context,
  });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
  return json<Matter>(response);
}

describe('vertical end to end', () => {
  it('runs intake to delivered report with citations, redline, deadline and one confirmed effect', async () => {
    // 1. Intake with a confirmed scope.
    const intakeResponse = await post('/v1/legal/matters', {
      title: 'Revision de contrato de servicios',
      purpose: 'review-contract',
      territory: 'ES',
      applicableDate: '2026-01-10',
      requestedAction: 'prepare-draft',
      scopeComplete: true,
    });
    expect(intakeResponse.status).toBe(201);
    let matter = await json<Matter>(intakeResponse);
    expect(matter.state).toBe('scope_pending');

    // 2. Conflicts.
    const conflictResponse = await post(`/v1/legal/matters/${matter.id}/conflicts`, {
      partyRefs: ['Proveedor Ejemplo SL'],
      representation: 'cliente-comprador',
      result: 'clear',
    });
    expect(conflictResponse.status).toBe(201);
    matter = await transition(matter, 'conflict_review');

    // 3. Facts and research.
    matter = await transition(matter, 'fact_gathering');
    matter = await transition(matter, 'research');

    // 4. Citation verification separates existence, force and pertinence.
    const citationResponse = await post('/v1/legal/citations/verify', {
      citation: 'Ley 1/2020',
      jurisdiction: 'ES',
      applicableDate: '2025-06-01',
    });
    expect(citationResponse.status).toBe(200);
    const citation = await json<{
      status: string;
      resolvedAuthorityRef: string | null;
      sourceHash: string | null;
    }>(citationResponse);
    expect(citation.status).toBe('verified');
    expect(citation.resolvedAuthorityRef).toBe('BOE-A-2020-1');
    expect(citation.sourceHash).toBe('a'.repeat(64));

    // 5. Redline preview keeps the original intact.
    const original = [
      { id: 'p1', text: 'El proveedor prestara los servicios.' },
      { id: 'p2', text: 'El pago se realizara en 30 dias.' },
    ];
    const redlineResponse = await post('/v1/legal/redlines/preview', {
      contractRevisionId: 'cr_1',
      baseHash: hashParagraphs(original),
      expectedVersion: 1,
      currentVersion: 1,
      original,
      editOps: [
        {
          op: 'replace',
          paragraphId: 'p2',
          expectedTextHash: paragraphHash('El pago se realizara en 30 dias.'),
          text: 'El pago se realizara en 60 dias.',
        },
      ],
    });
    expect(redlineResponse.status).toBe(200);
    const redline = await json<{ semanticDiff: { modified: unknown[] } }>(redlineResponse);
    expect(redline.semanticDiff.modified).toHaveLength(1);
    expect(original[1]?.text).toBe('El pago se realizara en 30 dias.');

    // 6. Deadline proposal requires proven trigger and review.
    const deadlineResponse = await post('/v1/legal/deadlines/propose', {
      matterId: matter.id,
      rule: {
        id: 'rule-15d',
        version: 1,
        territory: 'ES',
        dayCount: 15,
        dayType: 'business',
        startRule: 'next_day',
      },
      trigger: { id: 'trg_1', occurredAt: '2026-01-09', evidenceRef: 'evd_1' },
      calendar: { territory: 'ES', version: '2026a', holidays: [] },
    });
    expect(deadlineResponse.status).toBe(200);
    const deadline = await json<{ status: string; requiresReview: boolean; dueDate: string }>(
      deadlineResponse,
    );
    expect(deadline.status).toBe('proposed');
    expect(deadline.requiresReview).toBe(true);
    expect(deadline.dueDate).toBe('2026-01-30');

    // 7. Draft, competent review and delivery.
    matter = await transition(matter, 'draft');
    matter = await transition(matter, 'professional_review');
    matter = await transition(matter, 'approved_draft', {
      competentReviewRef: 'rev_1',
      reviewerIsProposer: false,
      pendingRequiredFacts: 0,
    });
    matter = await transition(matter, 'delivered', { approvalValid: true });
    expect(matter.state).toBe('delivered');

    // 8. Report keeps pending items visible.
    const reportResponse = await post('/v1/legal/reports', {
      matterId: matter.id,
      facts: [
        {
          id: 'fact_1',
          tenantId: principalA.tenantId,
          version: 1,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
          matterId: matter.id,
          statement: 'El contrato se firmo el 9 de enero.',
          status: 'unverified',
          evidenceRefs: [],
          contradictoryEvidenceRefs: [],
          reviewerRef: null,
        },
      ],
      citations: [
        {
          citation: 'Ley 1/2020',
          status: 'verified',
          reasons: [],
          resolvedAuthorityRef: citation.resolvedAuthorityRef,
          sourceHash: citation.sourceHash,
        },
      ],
    });
    expect(reportResponse.status).toBe(201);
    const report = await json<{
      id: string;
      pending: string[];
      sources: unknown[];
      hash: string;
    }>(reportResponse);
    expect(report.pending).toContain('FACT_fact_1_UNVERIFIED');
    expect(report.sources).toHaveLength(1);
    expect(report.hash).toHaveLength(64);

    // 9. One approved, idempotent effect.
    const payload = { draftHash: 'draft-v1', recipient: 'registro@example.test' };
    const approval = approvalFor({
      resourceId: matter.id,
      resourceVersion: matter.version,
      payloadHash: hashJson(payload),
    });
    runtime.approvalStore.save(approval);

    const intentBody = {
      capability: 'legal.filing.propose',
      idempotencyKey: 'idem-e2e-1',
      payload,
      approvalRef: approval.id,
      operation: {
        resourceId: matter.id,
        resourceVersion: matter.version,
        recipient: 'registro@example.test',
        channel: 'filing-gateway',
        scope: 'present-draft',
        policyHash: POLICY_HASH,
      },
      purpose: 'present-draft',
      revocationVersion: 0,
    };

    const intentResponse = await post('/v1/legal/intents', intentBody);
    expect(intentResponse.status).toBe(201);
    const intent = await json<{ intent: { status: string; receiptRef: string }; replayed: boolean }>(
      intentResponse,
    );
    expect(intent.intent.status).toBe('confirmed');
    expect(intent.intent.receiptRef).toBeTruthy();
    expect(intent.replayed).toBe(false);
    expect(provider.effects).toHaveLength(1);

    // 10. Replay does not duplicate the effect.
    const replayResponse = await post('/v1/legal/intents', intentBody);
    expect(replayResponse.status).toBe(201);
    const replay = await json<{ replayed: boolean }>(replayResponse);
    expect(replay.replayed).toBe(true);
    expect(provider.effects).toHaveLength(1);

    // 11. Cross-tenant isolation for matter and report.
    expect((await get(`/v1/legal/matters/${matter.id}`, 'b')).status).toBe(404);
    expect((await get(`/v1/legal/reports/${report.id}`, 'b')).status).toBe(404);

    // 12. Audit trail is tenant-scoped.
    expect(runtime.audit.list(principalA.tenantId).length).toBeGreaterThan(0);
    expect(runtime.audit.list(TENANT_B)).toHaveLength(0);
  });
});
