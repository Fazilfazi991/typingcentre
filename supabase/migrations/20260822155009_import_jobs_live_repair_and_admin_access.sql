-- Corrects the production ledger gap: the earlier migration is recorded but
-- its import tables are absent. All records remain tenant-scoped.
do $$ begin
  create type public.import_job_status as enum ('uploaded','validating','ready','importing','completed','completed_with_errors','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.import_row_status as enum ('ready','possible_duplicate','existing','invalid','imported','skipped','failed');
exception when duplicate_object then null; end $$;

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict, file_name text not null check (char_length(file_name) between 1 and 255),
  source_format text not null check (source_format in ('csv','xlsx')), sheet_name text, status public.import_job_status not null default 'uploaded',
  total_rows integer not null default 0 check (total_rows >= 0), processed_rows integer not null default 0 check (processed_rows >= 0 and processed_rows <= total_rows),
  customers_created integer not null default 0, companies_created integer not null default 0, documents_created integer not null default 0,
  records_updated integer not null default 0, records_skipped integer not null default 0, records_failed integer not null default 0,
  mapping jsonb not null default '{}'::jsonb, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(), import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, source_sheet_name text not null,
  row_number integer not null check (row_number > 0), source_data jsonb not null default '{}'::jsonb, normalized_data jsonb not null default '{}'::jsonb,
  status public.import_row_status not null default 'ready', resolution text check (resolution in ('create','skip','update')),
  issues jsonb not null default '[]'::jsonb, duplicate_of jsonb not null default '[]'::jsonb,
  customer_id uuid references public.customers(id) on delete set null, company_id uuid references public.companies(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null, imported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  unique (import_job_id, source_sheet_name, row_number)
);
create index if not exists import_jobs_organization_created_idx on public.import_jobs (organization_id, created_at desc);
create index if not exists import_job_rows_job_status_idx on public.import_job_rows (import_job_id, status, row_number);
alter table public.import_jobs enable row level security; alter table public.import_job_rows enable row level security;
revoke all on public.import_jobs, public.import_job_rows from anon, authenticated;
grant select, insert, update on public.import_jobs, public.import_job_rows to authenticated;
drop policy if exists import_jobs_manage_owner on public.import_jobs;
create policy import_jobs_manage_owner on public.import_jobs for all to authenticated using ((select security.is_organization_owner(organization_id))) with check ((select security.is_organization_owner(organization_id)) and created_by = (select auth.uid()));
drop policy if exists import_job_rows_manage_owner on public.import_job_rows;
create policy import_job_rows_manage_owner on public.import_job_rows for all to authenticated using ((select security.is_organization_owner(organization_id))) with check ((select security.is_organization_owner(organization_id)));
