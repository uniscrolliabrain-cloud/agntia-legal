-- Agntia Legal - schema v1
-- Target: Postgres 15+ / Supabase.
-- Status: written, NOT_VERIFIED against a live database (no Postgres runtime in
-- the delivery environment). Apply in an isolated project before any real data.

begin;

-- gen_random_uuid() is built in since Postgres 13; no extension is required.
create schema if not exists legal;

create table legal.tenants (
  id text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table legal.memberships (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  user_id uuid not null,
  roles text[] not null check (cardinality(roles) between 1 and 8),
  status text not null check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table legal.matters (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  version integer not null check (version >= 1),
  requesting_actor_id text not null,
  title text not null check (length(title) between 1 and 256),
  purpose text not null,
  territory text not null,
  applicable_date date not null,
  requested_action text not null,
  state text not null check (state in (
    'intake', 'scope_pending', 'conflict_review', 'fact_gathering', 'research',
    'draft', 'professional_review', 'approved_draft', 'delivered', 'stale',
    'blocked', 'closed'
  )),
  scope_ref text,
  conflict_check_ref text,
  reviewer_ref text,
  approval_ref text,
  blockers jsonb not null default '[]'::jsonb check (jsonb_typeof(blockers) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table legal.conflict_checks (
  tenant_id text not null,
  id text not null,
  version integer not null default 1 check (version >= 1),
  matter_id text not null,
  party_refs jsonb not null check (jsonb_typeof(party_refs) = 'array'),
  representation text not null,
  result text not null check (result in ('clear', 'possible_conflict', 'conflict', 'insufficient_data')),
  requested_by text,
  reviewer_ref text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.documents (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  matter_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.document_versions (
  tenant_id text not null,
  id text not null,
  document_id text not null,
  revision integer not null check (revision >= 1),
  original_hash text not null check (original_hash ~ '^[a-f0-9]{64}$'),
  custodian text not null,
  source_ref text not null,
  received_at timestamptz not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_ref text not null,
  supersedes text,
  extraction_status text not null check (extraction_status in ('pending', 'extracted', 'needs_review', 'failed')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, document_id, revision),
  foreign key (tenant_id, document_id) references legal.documents (tenant_id, id) on delete cascade,
  foreign key (tenant_id, supersedes) references legal.document_versions (tenant_id, id)
);

create table legal.evidence_refs (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  matter_id text,
  resource_scope text not null,
  original_custodian text not null,
  source_object_ref text not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  mapper_version text not null,
  observed_at timestamptz not null,
  effective_at date,
  kind text not null check (kind in ('fact', 'inference', 'user_assertion', 'observation')),
  review_ref text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.facts (
  tenant_id text not null,
  id text not null,
  version integer not null default 1 check (version >= 1),
  matter_id text not null,
  statement text not null,
  status text not null check (status in ('asserted', 'corroborated', 'contradicted', 'unverified')),
  reviewer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.fact_evidence (
  tenant_id text not null,
  fact_id text not null,
  evidence_id text not null,
  relation text not null check (relation in ('supports', 'contradicts')),
  primary key (tenant_id, fact_id, evidence_id, relation),
  foreign key (tenant_id, fact_id) references legal.facts (tenant_id, id) on delete cascade,
  foreign key (tenant_id, evidence_id) references legal.evidence_refs (tenant_id, id) on delete cascade
);

create table legal.law_snapshots (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  law_id text not null,
  official_ref text not null,
  jurisdiction text not null,
  version_date date not null,
  consolidation_status text not null check (consolidation_status in ('consolidated', 'pending', 'unknown')),
  effective_from date not null,
  effective_to date,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  retrieved_at timestamptz not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, law_id, version_date),
  check (effective_to is null or effective_to >= effective_from)
);

create table legal.citation_verifications (
  tenant_id text not null,
  id text not null,
  matter_id text,
  citation text not null,
  resolver text not null,
  resolved_authority_ref text,
  source_hash text check (source_hash is null or source_hash ~ '^[a-f0-9]{64}$'),
  jurisdiction text not null,
  applicable_date date not null,
  existence boolean not null,
  fragment text,
  in_force boolean,
  pertinence text not null check (pertinence in ('applicable', 'not_applicable', 'unknown')),
  status text not null check (status in ('verified', 'needs_review', 'unsupported', 'not_found', 'invalid')),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  verified_at timestamptz not null,
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.approvals (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  resource_id text not null,
  resource_version integer not null check (resource_version >= 1),
  principal_id text not null,
  principal_role text not null,
  proof_ref text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  rights_hash text not null check (rights_hash ~ '^[a-f0-9]{64}$'),
  policy_hash text not null check (policy_hash ~ '^[a-f0-9]{64}$'),
  recipient text not null,
  channel text not null,
  scope text not null,
  cost_ceiling jsonb not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revocation_version integer not null default 0 check (revocation_version >= 0),
  revoked_at timestamptz,
  approval_hash text not null check (approval_hash ~ '^[a-f0-9]{64}$'),
  primary key (tenant_id, id),
  check (expires_at > issued_at)
);

create table legal.intents (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  version integer not null default 1 check (version >= 1),
  actor_id text not null,
  capability text not null,
  idempotency_key text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  approval_ref text,
  status text not null check (status in (
    'proposed', 'needs_review', 'approved', 'queued', 'running', 'accepted',
    'confirmed', 'failed_definitive', 'outcome_unknown',
    'reconciliation_required', 'cancelled'
  )),
  receipt_ref text,
  remote_ref text,
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  reconciliation_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, capability, idempotency_key),
  foreign key (tenant_id, approval_ref) references legal.approvals (tenant_id, id)
);

create table legal.intent_attempts (
  tenant_id text not null,
  intent_id text not null,
  attempt integer not null check (attempt >= 1),
  started_at timestamptz not null,
  finished_at timestamptz,
  outcome text not null check (outcome in ('provider_accepted', 'provider_timeout', 'provider_unavailable', 'provider_error')),
  provider_ref text,
  primary key (tenant_id, intent_id, attempt),
  foreign key (tenant_id, intent_id) references legal.intents (tenant_id, id) on delete cascade
);

create table legal.audit_events (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  actor_id text not null,
  action text not null,
  resource_id text,
  correlation_id text,
  occurred_at timestamptz not null,
  outcome text not null check (outcome in ('allowed', 'blocked', 'failed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  primary key (tenant_id, id)
);

create table legal.outbox (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  event_id text not null,
  type text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('pending', 'claimed', 'acknowledged', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  acknowledged_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, event_id)
);

create table legal.reports (
  tenant_id text not null,
  id text not null,
  matter_id text not null,
  matter_version integer not null check (matter_version >= 1),
  generated_at timestamptz not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  hash text not null check (hash ~ '^[a-f0-9]{64}$'),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.review_opinions (
  tenant_id text not null,
  id text not null,
  version integer not null default 1 check (version >= 1),
  matter_id text not null,
  reviewer_id text not null,
  reviewer_qualification text not null,
  scope text not null,
  findings jsonb not null check (jsonb_typeof(findings) = 'array'),
  decision text not null check (decision in ('approved', 'rejected', 'needs_changes')),
  signed_decision_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, matter_id) references legal.matters (tenant_id, id) on delete cascade
);

create table legal.retention_holds (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  version integer not null default 1 check (version >= 1),
  retention_rule text not null,
  hold_scope text not null,
  requester_proof text not null,
  requested_by text,
  export_acl jsonb not null default '[]'::jsonb check (jsonb_typeof(export_acl) = 'array'),
  expires_at timestamptz,
  status text not null check (status in ('active', 'released', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table legal.budget_reservations (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  version integer not null default 1 check (version >= 1),
  operation_key text not null,
  amount jsonb not null,
  status text not null check (status in ('reserved', 'consumed', 'released', 'expired')),
  consumed_amount jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, operation_key)
);

create table legal.jobs (
  tenant_id text not null references legal.tenants (id) on delete cascade,
  id text not null,
  kind text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  lease_owner text,
  lease_expires_at timestamptz,
  fencing_token bigint not null default 0,
  attempts integer not null default 0,
  cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index matters_state_idx on legal.matters (tenant_id, state);
create index conflict_checks_matter_idx on legal.conflict_checks (tenant_id, matter_id);
create index document_versions_document_idx on legal.document_versions (tenant_id, document_id);
create index evidence_matter_idx on legal.evidence_refs (tenant_id, matter_id);
create index law_snapshots_lookup_idx on legal.law_snapshots (tenant_id, official_ref, effective_from);
create index citation_matter_idx on legal.citation_verifications (tenant_id, matter_id);
create index intents_status_idx on legal.intents (tenant_id, status);
create index audit_occurred_idx on legal.audit_events (tenant_id, occurred_at);
create index outbox_state_idx on legal.outbox (tenant_id, state);
create index jobs_status_idx on legal.jobs (tenant_id, status);
create index review_matter_idx on legal.review_opinions (tenant_id, matter_id);
create index retention_status_idx on legal.retention_holds (tenant_id, status);

commit;
