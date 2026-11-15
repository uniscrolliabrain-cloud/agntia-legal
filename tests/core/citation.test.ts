import { describe, expect, it } from 'vitest';
import { verifyCitation } from '../../src/core/citation.js';
import { InMemoryCitationResolver, InMemoryLawSnapshots } from '../../src/adapters/sources.js';
import { LegalError } from '../../src/domain/errors.js';

const hash = (char: string) => char.repeat(64);

const resolver = new InMemoryCitationResolver({
  'Ley 1/2020': {
    kind: 'legislation',
    authorityRef: 'BOE-A-2020-1',
    officialRef: 'BOE-A-2020-1',
    jurisdiction: 'ES',
  },
  'Ley 2/2010': {
    kind: 'legislation',
    authorityRef: 'BOE-A-2010-2',
    jurisdiction: 'ES-CT',
  },
  'Ley 3/2015': {
    kind: 'legislation',
    authorityRef: 'BOE-A-2015-3',
    jurisdiction: 'ES',
  },
  'Ley 4/2015': {
    kind: 'legislation',
    authorityRef: 'BOE-A-2015-4',
    jurisdiction: 'ES',
  },
  'ECLI:ES:TS:2020:1': {
    kind: 'unsupported',
    authorityRef: 'ecli-es-ts-2020-1',
    jurisdiction: 'ES',
  },
});

const snapshots = new InMemoryLawSnapshots([
  {
    authorityRef: 'BOE-A-2020-1',
    jurisdiction: 'ES',
    sourceHash: hash('a'),
    versionDate: '2020-01-01',
    effectiveFrom: '2020-01-02',
    effectiveTo: null,
    consolidationStatus: 'consolidated',
    fragment: 'Articulo 1. Objeto de la ley.',
  },
  {
    authorityRef: 'BOE-A-2010-2',
    jurisdiction: 'ES-CT',
    sourceHash: hash('b'),
    versionDate: '2010-01-01',
    effectiveFrom: '2010-01-01',
    effectiveTo: null,
    consolidationStatus: 'consolidated',
    fragment: 'Articulo 1. Ambito.',
  },
  {
    authorityRef: 'BOE-A-2015-3',
    jurisdiction: 'ES',
    sourceHash: hash('c'),
    versionDate: '2015-01-01',
    effectiveFrom: '2015-01-01',
    effectiveTo: null,
    consolidationStatus: 'consolidated',
    fragment: null,
  },
  {
    authorityRef: 'BOE-A-2015-4',
    jurisdiction: 'ES',
    sourceHash: hash('d'),
    versionDate: '2015-01-01',
    effectiveFrom: '2015-01-01',
    effectiveTo: null,
    consolidationStatus: 'pending',
    fragment: 'Articulo 1.',
  },
]);

const deps = { resolver, snapshots, now: new Date('2026-11-14T00:00:00.000Z') };

describe('citation verification', () => {
  it('verifies only when the fragment, force and pertinence all hold', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 1/2020', jurisdiction: 'ES', applicableDate: '2025-06-01' },
      deps,
    );
    expect(result.status).toBe('verified');
    expect(result.existence).toBe(true);
    expect(result.inForce).toBe(true);
    expect(result.pertinence).toBe('applicable');
    expect(result.sourceHash).toBe(hash('a'));
    expect(result.reasons).toEqual([]);
  });

  it('returns not_found instead of inventing an authority', async () => {
    const result = await verifyCitation(
      { citation: 'Ley inexistente 9/2099', jurisdiction: 'ES', applicableDate: '2025-06-01' },
      deps,
    );
    expect(result.status).toBe('not_found');
    expect(result.existence).toBe(false);
    expect(result.reasons).toContain('AUTHORITY_NOT_FOUND');
  });

  it('marks an unsupported citation unsupported, never valid', async () => {
    const result = await verifyCitation(
      { citation: 'ECLI:ES:TS:2020:1', jurisdiction: 'ES', applicableDate: '2025-06-01' },
      deps,
    );
    expect(result.status).toBe('unsupported');
    expect(result.existence).toBe(false);
  });

  it('does not treat another territory as applicable', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 2/2010', jurisdiction: 'ES', applicableDate: '2025-06-01' },
      deps,
    );
    expect(result.pertinence).toBe('not_applicable');
    expect(result.status).toBe('needs_review');
    expect(result.reasons.join(' ')).toContain('JURISDICTION_MISMATCH');
  });

  it('detects a law that was not in force on the applicable date', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 1/2020', jurisdiction: 'ES', applicableDate: '2019-06-01' },
      deps,
    );
    expect(result.inForce).toBe(false);
    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('NOT_IN_FORCE_FOR_APPLICABLE_DATE');
  });

  it('does not verify existence without a snapshot', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 2/2010', jurisdiction: 'ES-CT', applicableDate: '2025-06-01' },
      { ...deps, snapshots: new InMemoryLawSnapshots([]) },
    );
    expect(result.existence).toBe(true);
    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('SNAPSHOT_NOT_AVAILABLE');
  });

  it('requires a verified fragment', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 3/2015', jurisdiction: 'ES', applicableDate: '2021-06-01' },
      deps,
    );
    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('VERIFIED_FRAGMENT_REQUIRED');
  });

  it('flags pending consolidation', async () => {
    const result = await verifyCitation(
      { citation: 'Ley 4/2015', jurisdiction: 'ES', applicableDate: '2021-06-01' },
      deps,
    );
    expect(result.status).toBe('needs_review');
    expect(result.reasons).toContain('CONSOLIDATION_PENDING');
  });

  it('rejects an empty citation', async () => {
    await expect(
      verifyCitation({ citation: '   ', jurisdiction: 'ES', applicableDate: '2025-06-01' }, deps),
    ).rejects.toBeInstanceOf(LegalError);
  });
});
