-- Resumable tenant setup and a tenant-scoped import ledger.  Raw spreadsheets
-- are intentionally not retained in the database.
alter table public.organizations
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step smallint not null default 1
    check (onboarding_step between 1 and 4);

-- Existing workspaces predate the guided setup and must not be sent back through it.
update public.organizations
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at), onboarding_step = 4
where onboarding_completed_at is null;

create type public.import_job_status as enum (
  'uploaded', 'validating', 'ready', 'importing', 'completed', 'completed_with_errors', 'failed'
);

create type public.import_row_status as enum (
  'ready', 'possible_duplicate', 'existing', 'invalid', 'imported', 'skipped', 'failed'
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null check (char_length(file_name) between 1 and 255),
  source_format text not null check (source_format in ('csv', 'xlsx')),
  sheet_name text,
  status public.import_job_status not null default 'uploaded',
  total_rows integer not null default 0 check (total_rows >= 0),
  processed_rows integer not null default 0 check (processed_rows >= 0 and processed_rows <= total_rows),
  customers_created integer not null default 0 check (customers_created >= 0),
  companies_created integer not null default 0 check (companies_created >= 0),
  documents_created integer not null default 0 check (documents_created >= 0),
  records_updated integer not null default 0 check (records_updated >= 0),
  records_skipped integer not null default 0 check (records_skipped >= 0),
  records_failed integer not null default 0 check (records_failed >= 0),
  mapping jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_sheet_name text not null,
  row_number integer not null check (row_number > 0),
  source_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  status public.import_row_status not null default 'ready',
  resolution text check (resolution in ('create', 'skip', 'update')),
  issues jsonb not null default '[]'::jsonb,
  duplicate_of jsonb not null default '[]'::jsonb,
  customer_id uuid references public.customers(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  imported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (import_job_id, source_sheet_name, row_number)
);

create index import_jobs_organization_created_idx on public.import_jobs (organization_id, created_at desc);
create index import_job_rows_job_status_idx on public.import_job_rows (import_job_id, status, row_number);
create index import_job_rows_organization_document_idx on public.import_job_rows (organization_id, document_id) where document_id is not null;

create trigger import_jobs_set_updated_at before update on public.import_jobs for each row execute function public.set_updated_at();
create trigger import_job_rows_set_updated_at before update on public.import_job_rows for each row execute function public.set_updated_at();

alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
revoke all on public.import_jobs, public.import_job_rows from anon, authenticated;
grant select, insert, update on public.import_jobs, public.import_job_rows to authenticated;
grant all on public.import_jobs, public.import_job_rows to service_role;

create policy import_jobs_select_owner on public.import_jobs for select to authenticated
  using ((select security.is_organization_owner(organization_id)));
create policy import_jobs_insert_owner on public.import_jobs for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)) and created_by = (select auth.uid()));
create policy import_jobs_update_owner on public.import_jobs for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));
create policy import_job_rows_select_owner on public.import_job_rows for select to authenticated
  using ((select security.is_organization_owner(organization_id)));
create policy import_job_rows_insert_owner on public.import_job_rows for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy import_job_rows_update_owner on public.import_job_rows for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

comment on table public.import_jobs is 'Tenant-scoped import job ledger; original files are parsed transiently and are not retained.';
comment on table public.import_job_rows is 'Tenant-scoped detailed import provenance and retry/idempotency ledger.';
