-- Reconcile only the effects missing from the historically applied
-- 20260813215339_tenant_onboarding_and_import_jobs migration.  Later import
-- policy/grant changes remain authoritative and are intentionally untouched.
alter table public.organizations
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step smallint not null default 1
    check (onboarding_step between 1 and 4);

-- Existing workspaces predate the guided setup and must not be sent back through it.
update public.organizations
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at), onboarding_step = 4
where onboarding_completed_at is null;

create index if not exists import_job_rows_organization_document_idx
  on public.import_job_rows (organization_id, document_id)
  where document_id is not null;

drop trigger if exists import_jobs_set_updated_at on public.import_jobs;
create trigger import_jobs_set_updated_at
  before update on public.import_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists import_job_rows_set_updated_at on public.import_job_rows;
create trigger import_job_rows_set_updated_at
  before update on public.import_job_rows
  for each row execute function public.set_updated_at();

comment on table public.import_jobs is 'Tenant-scoped import job ledger; original files are parsed transiently and are not retained.';
comment on table public.import_job_rows is 'Tenant-scoped detailed import provenance and retry/idempotency ledger.';
