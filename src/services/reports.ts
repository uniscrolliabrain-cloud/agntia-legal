import { randomUUID } from 'node:crypto';
import type { CitationVerificationResult } from '../core/citation.js';
import { hashJson } from '../core/hash.js';
import type { FactAssertion, LegalMatter } from '../domain/entities.js';

export const REPORT_DISCLAIMER =
  'Borrador asistido por software. No constituye dictamen juridico, no acredita representacion, ' +
  'competencia profesional ni secreto profesional, y requiere revision de un profesional competente. ' +
  'Territorio y fecha aplicable se declaran en el expediente.';

export interface LegalReport {
  id: string;
  tenantId: string;
  matterId: string;
  matterVersion: number;
  generatedAt: string;
  coverage: {
    facts: number;
    corroboratedFacts: number;
    citations: number;
    verifiedCitations: number;
  };
  pending: string[];
  limitations: string[];
  citations: Array<{ citation: string; status: string; reasons: string[] }>;
  sources: Array<{ authorityRef: string; sourceHash: string }>;
  disclaimer: string;
  hash: string;
}

export interface BuildReportInput {
  tenantId: string;
  matter: LegalMatter;
  facts: readonly FactAssertion[];
  citations: readonly CitationVerificationResult[];
  limitations?: readonly string[];
  now: Date;
  id?: string;
}

/**
 * Report is a snapshot, not a live calculation: pending and unverified items
 * stay visible and the hash makes later tampering detectable.
 */
export function buildLegalReport(input: BuildReportInput): LegalReport {
  const pending = new Set<string>();

  for (const blocker of input.matter.blockers) pending.add(`MATTER_${blocker}`);
  for (const fact of input.facts) {
    if (fact.status === 'unverified' || fact.status === 'asserted') {
      pending.add(`FACT_${fact.id}_${fact.status.toUpperCase()}`);
    }
    if (fact.status === 'contradicted') pending.add(`FACT_${fact.id}_CONTRADICTED`);
  }
  for (const citation of input.citations) {
    if (citation.status !== 'verified') {
      pending.add(`CITATION_${citation.citation}_${citation.status.toUpperCase()}`);
    }
  }

  const sources = input.citations
    .filter(
      (citation): citation is CitationVerificationResult & { resolvedAuthorityRef: string; sourceHash: string } =>
        citation.resolvedAuthorityRef !== null && citation.sourceHash !== null,
    )
    .map((citation) => ({
      authorityRef: citation.resolvedAuthorityRef,
      sourceHash: citation.sourceHash,
    }));

  const body = {
    tenantId: input.tenantId,
    matterId: input.matter.id,
    matterVersion: input.matter.version,
    generatedAt: input.now.toISOString(),
    coverage: {
      facts: input.facts.length,
      corroboratedFacts: input.facts.filter((fact) => fact.status === 'corroborated').length,
      citations: input.citations.length,
      verifiedCitations: input.citations.filter((citation) => citation.status === 'verified').length,
    },
    pending: [...pending].sort(),
    limitations: [...new Set(input.limitations ?? [])],
    citations: input.citations.map((citation) => ({
      citation: citation.citation,
      status: citation.status,
      reasons: [...citation.reasons],
    })),
    sources,
    disclaimer: REPORT_DISCLAIMER,
  };

  return {
    id: input.id ?? `rpt_${randomUUID()}`,
    ...body,
    hash: hashJson(body),
  };
}
