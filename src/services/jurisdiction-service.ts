import { LegalError } from '../domain/errors.js';
import { isoDateSchema } from '../domain/ids.js';

export interface CompetenceEntry {
  territory: string;
  level: 'national' | 'subnational' | 'eu';
  instrumentRef: string;
  status: 'confirmed' | 'pending' | 'disputed';
  verifiedAt: string;
}

/** Versioned competence registry; an unknown territory is never confirmed. */
export class CompetenceRegistry {
  constructor(private readonly entries: readonly CompetenceEntry[] = []) {}

  lookup(territory: string): CompetenceEntry | null {
    return this.entries.find((entry) => entry.territory === territory) ?? null;
  }

  isConfirmed(territory: string): boolean {
    return this.lookup(territory)?.status === 'confirmed';
  }
}

export interface ApplicabilityInput {
  territory: string;
  applicableDate: string;
  /** Territory asserted by a contract or a user, if any. */
  claimTerritory?: string | null;
  euMemberState?: boolean;
  /** Only `confirmed` allows a subnational conclusion. */
  subnationalCompetence?: 'confirmed' | 'pending' | 'unknown';
  /** Optional registry; it can confirm a subnational level on its own. */
  registry?: CompetenceRegistry;
}

export interface ApplicabilityResult {
  status: 'confirmed' | 'needs_review' | 'blocked';
  reasons: string[];
  levels: string[];
}

/**
 * Territory and date are mandatory. Subnational (autonomic/foral) and EU
 * overlays are never simplified: without confirmed competence they stay
 * `needs_review`, and a contradiction with the claimed territory blocks a
 * silent choice.
 */
export function assessApplicableLaw(input: ApplicabilityInput): ApplicabilityResult {
  const reasons: string[] = [];
  const territory = (input.territory ?? '').trim();

  if (territory.length < 2 || territory.length > 16) {
    return { status: 'blocked', reasons: ['INVALID_TERRITORY'], levels: [] };
  }
  if (!isoDateSchema.safeParse(input.applicableDate).success) {
    return { status: 'blocked', reasons: ['MISSING_OR_INVALID_APPLICABLE_DATE'], levels: [] };
  }

  const levels: string[] = [];
  if (input.euMemberState) levels.push('EU');
  levels.push(territory);

  const claimed = input.claimTerritory?.trim();
  if (claimed && claimed !== territory) {
    reasons.push('CLAIM_TERRITORY_MISMATCH');
  }

  const subnational = territory.startsWith('ES-') || territory.includes('/');
  if (subnational) {
    const confirmed =
      input.subnationalCompetence === 'confirmed' || input.registry?.isConfirmed(territory) === true;
    if (!confirmed) {
      reasons.push('SUBNATIONAL_COMPETENCE_PENDING');
    } else {
      levels.push('ES');
    }
  }

  if (territory === 'EU' || (input.euMemberState && claimed && claimed !== territory)) {
    reasons.push('MULTI_LEVEL_APPLICABILITY');
  }

  if (reasons.length === 0) {
    return { status: 'confirmed', reasons, levels };
  }

  return {
    status: 'needs_review',
    reasons: [...new Set(reasons)],
    levels,
  };
}

export function assertTerritoryAndDate(territory: string, applicableDate: string): void {
  if (!territory || territory.trim().length < 2) {
    throw new LegalError('INVALID_INPUT', 'Territory is required');
  }
  if (!isoDateSchema.safeParse(applicableDate).success) {
    throw new LegalError('INVALID_INPUT', 'Applicable date is required');
  }
}
