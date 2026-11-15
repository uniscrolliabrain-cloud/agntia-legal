-- Agntia Legal - row level security and tenant isolation
-- Target: Supabase (uses auth.uid() and request.jwt.claims).
-- Status: written, NOT_VERIFIED against a live database.
--
-- Security notes:
-- - The selected tenant is read from a server-issued claim (tenant_id or
--   app_metadata.tenant_id). Editable user_metadata is never read here.
-- - Every policy also requires an active membership row, so a signed but stale
--   or replayed claim cannot read another tenant.
-- - service_role/BYPASSRLS credentials bypass RLS: they are not proof of
--   isolation and must not be used by request paths.

begin;

alter table legal.tenants enable row level security;
alter table legal.memberships enable row level security;
alter table legal.matters enable row level security;
alter table legal.conflict_checks enable row level security;
alter table legal.documents enable row level security;
alter table legal.document_versions enable row level security;
alter table legal.evidence_refs enable row level security;
alter table legal.facts enable row level security;
alter table legal.fact_evidence enable row level security;
alter table legal.law_snapshots enable row level security;
alter table legal.citation_verifications enable row level security;
alter table legal.approvals enable row level security;
alter table legal.intents enable row level security;
alter table legal.intent_attempts enable row level security;
alter table legal.audit_events enable row level security;
alter table legal.outbox enable row level security;
alter table legal.reports enable row level security;
alter table legal.jobs enable row level security;
alter table legal.review_opinions enable row level security;
alter table legal.retention_holds enable row level security;
alter table legal.budget_reservations enable row level security;

create or replace function legal.current_tenant_id()
returns text
language sql
stable
as $$
  with claims as (
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb as value
  )
  select coalesce(
    nullif(claims.value ->> 'tenant_id', ''),
    nullif(claims.value -> 'app_metadata' ->> 'tenant_id', '')
  )
  from claims;
$$;

create or replace function legal.is_active_member(target_tenant text)
returns boolean
language sql
stable
security definer
set search_path = legal, auth, pg_temp
as $$
  select exists (
    select 1
    from legal.memberships membership
    where membership.tenant_id = target_tenant
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

revoke all on function legal.current_tenant_id() from public;
revoke all on function legal.is_active_member(text) from public;

create policy tenants_own on legal.tenants
  for select to authenticated
  using (id = legal.current_tenant_id() and legal.is_active_member(id));

create policy memberships_self on legal.memberships
  for select to authenticated
  using (user_id = auth.uid() and tenant_id = legal.current_tenant_id());

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'matters',
    'conflict_checks',
    'documents',
    'document_versions',
    'evidence_refs',
    'facts',
    'fact_evidence',
    'law_snapshots',
    'citation_verifications',
    'approvals',
    'intents',
    'intent_attempts',
    'audit_events',
    'outbox',
    'reports',
    'jobs',
    'review_opinions',
    'retention_holds',
    'budget_reservations'
  ]
  loop
    execute format(
      'create policy tenant_isolation on legal.%I as permissive for all to authenticated '
      'using (tenant_id = legal.current_tenant_id() and legal.is_active_member(tenant_id)) '
      'with check (tenant_id = legal.current_tenant_id() and legal.is_active_member(tenant_id))',
      target_table
    );
  end loop;
end;
$$;

create or replace function legal.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'legal.% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger audit_events_append_only
  before update or delete on legal.audit_events
  for each row execute function legal.reject_mutation();

grant usage on schema legal to authenticated;
grant select, insert, update, delete on all tables in schema legal to authenticated;

-- Append-only and snapshot tables.
revoke update, delete on legal.audit_events from authenticated;
revoke update, delete on legal.reports from authenticated;

grant execute on function legal.current_tenant_id() to authenticated;
grant execute on function legal.is_active_member(text) to authenticated;

comment on table legal.audit_events is
  'Append-only audit trail. No payloads, tokens or prompts may be stored here.';
comment on column legal.intents.idempotency_key is
  'Unique per (tenant_id, capability): replaying the same key must not create a second effect.';

commit;
