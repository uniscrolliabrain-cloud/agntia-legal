import type {
  CitationResolver,
  LawSnapshotLookup,
  LawSnapshotRecord,
  ResolvedAuthority,
} from '../core/citation.js';

/**
 * Local resolver backed by an explicit registry. Real deployments replace it
 * with a backend-specific adapter; an unknown citation returns null instead of
 * a plausible authority.
 */
export class InMemoryCitationResolver implements CitationResolver {
  readonly name: string;
  private readonly entries: Map<string, ResolvedAuthority>;

  constructor(entries: Record<string, ResolvedAuthority> = {}, name = 'in-memory-resolver') {
    this.name = name;
    this.entries = new Map(Object.entries(entries));
  }

  async resolve(citation: string): Promise<ResolvedAuthority | null> {
    return this.entries.get(citation) ?? null;
  }
}

export class InMemoryLawSnapshots implements LawSnapshotLookup {
  private readonly entries: Map<string, LawSnapshotRecord>;

  constructor(entries: LawSnapshotRecord[] = []) {
    this.entries = new Map(entries.map((entry) => [entry.authorityRef, entry]));
  }

  async find(authorityRef: string): Promise<LawSnapshotRecord | null> {
    return this.entries.get(authorityRef) ?? null;
  }
}
