import { describe, expect, it } from 'vitest';
import { createRuntime } from '../../src/container.js';
import { LegalError } from '../../src/domain/errors.js';
import { sha256Hex } from '../../src/core/hash.js';
import { evidence, makePrincipal, TENANT_B } from '../helpers/fixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const ownerA = makePrincipal({ userId: 'a', roles: ['owner'] });
const reviewerA = makePrincipal({ userId: 'r', roles: ['reviewer'] });
const ownerB = makePrincipal({ userId: 'b', tenantId: TENANT_B, roles: ['owner'] });

const runtime = createRuntime({
  resolvePrincipal: async (token: string) => {
    if (token === 'token-a') return ownerA;
    if (token === 'token-r') return reviewerA;
    if (token === 'token-b') return ownerB;
    throw new LegalError('UNAUTHENTICATED', 'Invalid token');
  },
  now: () => NOW,
});

const auth = (token = 'token-a') => ({ authorization: `Bearer ${token}` });

async function post(path: string, body: unknown, token = 'token-a'): Promise<Response> {
  return runtime.app.request(path, {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(path: string, token = 'token-a'): Promise<Response> {
  return runtime.app.request(path, { headers: auth(token) });
}

async function createMatter(token = 'token-a'): Promise<{ id: string }> {
  const response = await post(
    '/v1/legal/matters',
    {
      title: 'Revisión contractual',
      purpose: 'review',
      territory: 'ES',
      applicableDate: '2026-01-01',
      requestedAction: 'prepare-draft',
      scopeComplete: true,
    },
    token,
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

const documentBody = {
  title: 'Contrato',
  custodian: 'custodian_1',
  sourceRef: 'src:1',
  storageRef: 's3://b/1.pdf',
  contentHash: sha256Hex('v1'),
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  receivedAt: '2026-02-01T00:00:00.000Z',
};

describe('rutas de documentos', () => {
  it('registra un documento, lo lee y expone su historial', async () => {
    const matter = await createMatter();

    const staged = await post(`/v1/legal/matters/${matter.id}/documents`, documentBody);
    expect(staged.status).toBe(201);
    const result = (await staged.json()) as {
      document: { id: string; matterId: string; currentVersion: number };
      version: { revision: number };
    };
    expect(result.document.matterId).toBe(matter.id);
    expect(result.version.revision).toBe(1);

    const read = await get(`/v1/legal/documents/${result.document.id}`);
    expect(read.status).toBe(200);

    const history = await get(`/v1/legal/documents/${result.document.id}/history`);
    expect(history.status).toBe(200);
    expect(((await history.json()) as unknown[]).length).toBe(1);
  });

  it('no expone documentos ni asuntos de otro tenant', async () => {
    const matter = await createMatter();
    const staged = await post(`/v1/legal/matters/${matter.id}/documents`, documentBody);
    const { document } = (await staged.json()) as { document: { id: string } };

    const foreignDocument = await get(`/v1/legal/documents/${document.id}`, 'token-b');
    expect(foreignDocument.status).toBe(404);

    const foreignMatter = await get(`/v1/legal/matters/${matter.id}`, 'token-b');
    expect(foreignMatter.status).toBe(404);
  });

  it('rechaza un hash inválido con 400', async () => {
    const matter = await createMatter();
    const response = await post(`/v1/legal/matters/${matter.id}/documents`, {
      ...documentBody,
      contentHash: 'abc',
    });
    expect(response.status).toBe(400);
  });
});

describe('rutas de hechos', () => {
  it('corrobora con evidencia revisada y revisor, y lista por asunto', async () => {
    const matter = await createMatter();
    const response = await post(`/v1/legal/matters/${matter.id}/facts`, {
      statement: 'El contrato se firmó el 1 de febrero',
      status: 'corroborated',
      evidenceRefs: [evidence(ownerA.tenantId)],
      reviewerRef: 'rev_1',
    });

    expect(response.status).toBe(201);
    const fact = (await response.json()) as { status: string };
    expect(fact.status).toBe('corroborated');

    const list = await get(`/v1/legal/matters/${matter.id}/facts`);
    expect(list.status).toBe(200);
    expect(((await list.json()) as unknown[]).length).toBe(1);
  });

  it('bloquea una corroboración sin revisor con 409', async () => {
    const matter = await createMatter();
    const response = await post(`/v1/legal/matters/${matter.id}/facts`, {
      statement: 'Hecho sin revisor',
      status: 'corroborated',
      evidenceRefs: [evidence(ownerA.tenantId)],
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { code: string; details: { reason: string } } };
    expect(body.error.code).toBe('BLOCKED');
    expect(body.error.details.reason).toBe('REVIEW_REQUIRED');
  });
});

describe('rutas de revisión', () => {
  it('solo un actor distinto revisa el conflicto', async () => {
    const matter = await createMatter();
    const check = await post(`/v1/legal/matters/${matter.id}/conflicts`, {
      partyRefs: ['party_1'],
      representation: 'contraparte',
      result: 'possible_conflict',
    });
    expect(check.status).toBe(201);
    const { id } = (await check.json()) as { id: string };

    const selfReview = await post(
      `/v1/legal/matters/${matter.id}/conflicts/${id}/review`,
      { reviewerRef: 'rev_1', decision: 'cleared', rationale: 'Sin conflicto' },
      'token-a',
    );
    expect(selfReview.status).toBe(409);

    const reviewed = await post(
      `/v1/legal/matters/${matter.id}/conflicts/${id}/review`,
      { reviewerRef: 'rev_1', decision: 'cleared', rationale: 'Sin conflicto' },
      'token-r',
    );
    expect(reviewed.status).toBe(200);
    expect(((await reviewed.json()) as { result: string }).result).toBe('clear');
  });

  it('registra una revisión firmada de un revisor distinto del solicitante', async () => {
    const matter = await createMatter();
    const body = {
      reviewerQualification: 'Abogada colegiada',
      scope: 'memo',
      findings: ['Fuentes cotejadas'],
      decision: 'approved',
      signedDecisionRef: 'sig_1',
    };

    const selfReview = await post(`/v1/legal/matters/${matter.id}/reviews`, body, 'token-a');
    expect(selfReview.status).toBe(409);

    const review = await post(`/v1/legal/matters/${matter.id}/reviews`, body, 'token-r');
    expect(review.status).toBe(201);
    const opinion = (await review.json()) as { reviewerId: string; decision: string };
    expect(opinion.reviewerId).toBe(reviewerA.actorId);
    expect(opinion.decision).toBe('approved');

    const list = await get(`/v1/legal/matters/${matter.id}/reviews`);
    expect(list.status).toBe(200);
    expect(((await list.json()) as unknown[]).length).toBe(1);
  });
});
