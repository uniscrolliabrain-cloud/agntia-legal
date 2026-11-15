import { LegalError } from '../domain/errors.js';
import type { CitationStatus } from '../domain/entities.js';
import { isoDateSchema } from '../domain/ids.js';

export interface ResolvedAuthority {
  kind: 'legislation' | 'judgment' | 'doctrine' | 'unsupported';
  authorityRef: string;
  officialRef?: string;
  jurisdiction: string;
  ecli?: string;
}

export interface CitationResolver {
  readonly name: string;
  resolve(citation: string, jurisdiction: string): Promise<ResolvedAuthority | null>;
}

export interface LawSnapshotRecord {
  authorityRef: string;
  jurisdiction: string;
  sourceHash: string;
  versionDate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  consolidationStatus: 'consolidated' | 'pending' | 'unknown';
  /** Verified textual fragment; existence without a fragment is not enough. */
  fragment: string | null;
}

export interface LawSnapshotLookup {
  find(authorityRef: string, jurisdiction: string): Promise<LawSnapshotRecord | null>;
}

export interface ResolveCitationInput {
  citation: string;
  jurisdiction: string;
}

export type CitationResolution =
  | { status: 'resolved'; authority: ResolvedAuthority; resolver: string }
  | { status: 'unsupported'; reason: string; resolver: string }
  | { status: 'not_found'; resolver: string };

function normalizeCitation(citation: string): string {
  const trimmed = citation.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    throw new LegalError('INVALID_INPUT', 'Citation cannot be empty');
  }
  if (trimmed.length > 512) {
    throw new LegalError('INVALID_INPUT', 'Citation exceeds the supported length');
  }
  return trimmed;
}

/**
 * Resolves the identity of an authority. Resolution alone is not verification:
 * a real citation can be repealed, from another jurisdiction or inapplicable.
 */
export async function resolveCitation(
  input: ResolveCitationInput,
  resolver: CitationResolver,
): Promise<CitationResolution> {
  const citation = normalizeCitation(input.citation);
  if (!input.jurisdiction || input.jurisdiction.length < 2) {
    throw new LegalError('INVALID_INPUT', 'Jurisdiction is required');
  }
  const authority = await resolver.resolve(citation, input.jurisdiction);
  if (!authority) return { status: 'not_found', resolver: resolver.name };
  if (authority.kind === 'unsupported') {
    return {
      status: 'unsupported',
      reason: 'RESOLVER_DOES_NOT_SUPPORT_AUTHORITY_KIND',
      resolver: resolver.name,
    };
  }
  return { status: 'resolved', authority, resolver: resolver.name };
}

export interface VerifyCitationInput extends ResolveCitationInput {
  applicableDate: string;
  matterId?: string | null;
}

export interface VerifyCitationDeps {
  resolver: CitationResolver;
  snapshots: LawSnapshotLookup;
  now: Date;
}

export interface CitationVerificationResult {
  citation: string;
  resolver: string;
  resolvedAuthorityRef: string | null;
  sourceHash: string | null;
  jurisdiction: string;
  applicableDate: string;
  existence: boolean;
  fragment: string | null;
  inForce: boolean | null;
  pertinence: 'applicable' | 'not_applicable' | 'unknown';
  status: CitationStatus;
  reasons: string[];
  verifiedAt: string;
}

function parseDate(value: string, field: string): number {
  if (!isoDateSchema.safeParse(value).success) {
    throw new LegalError('INVALID_INPUT', `Invalid ${field}`, { details: { field, value } });
  }
  return new Date(`${value}T00:00:00Z`).getTime();
}

/**
 * Keeps the four questions separate: does the authority exist, is the fragment
 * verified, was it in force on the applicable date, and is it pertinent to the
 * jurisdiction? Only a fully positive result becomes `verified`; anything else
 * is `needs_review`, `unsupported` or `not_found`, never a silent success.
 */
export async function verifyCitation(
  input: VerifyCitationInput,
  deps: VerifyCitationDeps,
): Promise<CitationVerificationResult> {
  const applicableMs = parseDate(input.applicableDate, 'applicableDate');
  const resolution = await resolveCitation(input, deps.resolver);
  const base = {
    citation: normalizeCitation(input.citation),
    resolver: resolution.resolver,
    jurisdiction: input.jurisdiction,
    applicableDate: input.applicableDate,
    verifiedAt: deps.now.toISOString(),
  };

  if (resolution.status === 'not_found') {
    return {
      ...base,
      resolvedAuthorityRef: null,
      sourceHash: null,
      existence: false,
      fragment: null,
      inForce: null,
      pertinence: 'unknown',
      status: 'not_found',
      reasons: ['AUTHORITY_NOT_FOUND'],
    };
  }

  if (resolution.status === 'unsupported') {
    return {
      ...base,
      resolvedAuthorityRef: null,
      sourceHash: null,
      existence: false,
      fragment: null,
      inForce: null,
      pertinence: 'unknown',
      status: 'unsupported',
      reasons: [resolution.reason],
    };
  }

  const { authority } = resolution;
  const snapshot = await deps.snapshots.find(authority.authorityRef, input.jurisdiction);
  const reasons: string[] = [];

  let pertinence: CitationVerificationResult['pertinence'] = 'unknown';
  if (authority.jurisdiction === input.jurisdiction) {
    pertinence = 'applicable';
  } else {
    pertinence = 'not_applicable';
    reasons.push(`JURISDICTION_MISMATCH:${authority.jurisdiction}!=${input.jurisdiction}`);
  }

  if (!snapshot) {
    return {
      ...base,
      resolvedAuthorityRef: authority.authorityRef,
      sourceHash: null,
      existence: true,
      fragment: null,
      inForce: null,
      pertinence,
      status: 'needs_review',
      reasons: [...reasons, 'SNAPSHOT_NOT_AVAILABLE'],
    };
  }

  const fromMs = parseDate(snapshot.effectiveFrom, 'effectiveFrom');
  const toMs = snapshot.effectiveTo ? parseDate(snapshot.effectiveTo, 'effectiveTo') : Number.POSITIVE_INFINITY;
  const inForce = applicableMs >= fromMs && applicableMs <= toMs;
  if (!inForce) reasons.push('NOT_IN_FORCE_FOR_APPLICABLE_DATE');

  if (snapshot.consolidationStatus !== 'consolidated') {
    reasons.push(`CONSOLIDATION_${snapshot.consolidationStatus.toUpperCase()}`);
  }
  if (!snapshot.fragment || snapshot.fragment.trim().length === 0) {
    reasons.push('VERIFIED_FRAGMENT_REQUIRED');
  }

  const status: CitationStatus = reasons.length === 0 ? 'verified' : 'needs_review';

  return {
    ...base,
    resolvedAuthorityRef: authority.authorityRef,
    sourceHash: snapshot.sourceHash,
    existence: true,
    fragment: snapshot.fragment,
    inForce,
    pertinence,
    status,
    reasons,
  };
}
