-- Stage 6 Phase 6A. Apply manually through Supabase SQL Editor only after review.
-- Do not run db push while the remote migration ledger remains unresolved.

create type public.document_upload_status as enum ('pending', 'complete', 'failed');

alter table public.documents
  alter column expires_on drop not null,
  add column display_name text,
  add column current_version_id uuid,
  add column created_by uuid references auth.users(id) on delete set null;

update public.documents
set display_name = coalesce(nullif(trim(document_number), ''), 'Document')
where display_name is null;

alter table public.documents
  alter column display_name set not null,
  add constraint documents_branch_requires_company
    check (branch_id is null or company_id is not null);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  version_number integer not null check (version_number > 0),
  object_key text not null,
  original_filename text not null,
  stored_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  expected_mime_type text not null check (expected_mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  expected_size_bytes bigint not null check (expected_size_bytes > 0),
  file_size_bytes bigint check (file_size_bytes > 0),
  checksum text,
  upload_status public.document_upload_status not null default 'pending',
  uploaded_by uuid references auth.users(id) on delete set null,
  finalized_at timestamptz,
  cleanup_eligible_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (document_id, id),
  unique (document_id, version_number),
  unique (object_key),
  foreign key (organization_id, document_id)
    references public.documents (organization_id, id) on delete restrict,
  check ((upload_status = 'complete') = (finalized_at is not null)),
  check (upload_status <> 'complete' or file_size_bytes = expected_size_bytes),
  check (mime_type = expected_mime_type)
);

alter table public.documents
  add constraint documents_current_version_same_document_fk
    foreign key (id, current_version_id)
    references public.document_versions (document_id, id)
    deferrable initially deferred;

create index document_versions_document_created_idx
  on public.document_versions (document_id, created_at desc);
create index document_versions_organization_pending_cleanup_idx
  on public.document_versions (organization_id, cleanup_eligible_at)
  where upload_status in ('pending', 'failed');

create or replace function public.set_document_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create or replace function public.set_document_version_uploader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  new.uploaded_by := (select auth.uid());
  return new;
end;
$$;

create or replace function public.validate_document_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_company_id uuid;
begin
  if new.customer_id is null and new.company_id is null then
    raise exception 'A customer or company is required';
  end if;

  if new.branch_id is not null and new.company_id is null then
    raise exception 'A company is required when selecting a branch';
  end if;

  if new.customer_id is not null then
    select company_id into customer_company_id
    from public.customers
    where id = new.customer_id
      and organization_id = new.organization_id;
    if not found then
      raise exception 'Selected customer is unavailable';
    end if;
    if new.archived_at is null and exists (
      select 1 from public.customers where id = new.customer_id and archived_at is not null
    ) then
      raise exception 'Archived customers cannot receive new active documents';
    end if;
    if new.company_id is not null and customer_company_id is distinct from new.company_id then
      raise exception 'Selected customer does not belong to the selected company';
    end if;
  end if;

  if new.company_id is not null then
    if not exists (
      select 1 from public.companies
      where id = new.company_id
        and organization_id = new.organization_id
        and (new.archived_at is not null or archived_at is null)
    ) then
      raise exception 'Selected company is unavailable';
    end if;
  end if;

  if new.branch_id is not null and not exists (
    select 1 from public.branches
    where id = new.branch_id
      and organization_id = new.organization_id
      and company_id = new.company_id
      and (new.archived_at is not null or archived_at is null)
  ) then
    raise exception 'Select a branch that belongs to the selected company';
  end if;

  return new;
end;
$$;

create or replace function public.assign_document_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.documents where id = new.document_id for update;
  select coalesce(max(version_number), 0) + 1 into new.version_number
  from public.document_versions where document_id = new.document_id;
  return new;
end;
$$;

create or replace function public.prevent_document_security_field_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by then
    raise exception 'Document security fields cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.finalize_document_version(
  target_version_id uuid,
  confirmed_size_bytes bigint,
  confirmed_mime_type text
)
returns table (document_id uuid, current_version_id uuid, already_finalized boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.document_versions%rowtype;
begin
  select * into target
  from public.document_versions
  where id = target_version_id
    and organization_id in (
      select organization_id from public.organization_memberships
      where user_id = (select auth.uid())
        and role = 'owner'
        and status = 'active'
    )
  for update;

  if not found then
    raise exception 'Document upload is unavailable';
  end if;

  if target.upload_status = 'complete' then
    return query select target.document_id, target.id, true;
    return;
  end if;

  if target.upload_status <> 'pending'
    or target.expected_size_bytes <> confirmed_size_bytes
    or target.expected_mime_type <> confirmed_mime_type then
    update public.document_versions
    set upload_status = 'failed', cleanup_eligible_at = timezone('utc', now()) + interval '24 hours'
    where id = target.id and upload_status = 'pending';
    raise exception 'Uploaded file metadata did not match the approved request';
  end if;

  update public.document_versions
  set upload_status = 'complete',
      file_size_bytes = confirmed_size_bytes,
      mime_type = confirmed_mime_type,
      finalized_at = timezone('utc', now()),
      cleanup_eligible_at = null
  where id = target.id;

  update public.documents
  set current_version_id = target.id
  where id = target.document_id and organization_id = target.organization_id;

  update public.organization_usage_counters
  set stored_bytes = stored_bytes + confirmed_size_bytes,
      document_count = document_count + 1,
      updated_at = timezone('utc', now())
  where organization_id = target.organization_id;

  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message, metadata)
  values (target.organization_id, (select auth.uid()), 'document', target.document_id, 'Document upload completed', jsonb_build_object('version_id', target.id, 'version_number', target.version_number));

  return query select target.document_id, target.id, false;
end;
$$;

revoke all on function public.set_document_creator() from public;
revoke all on function public.set_document_version_uploader() from public;
revoke all on function public.validate_document_relationships() from public;
revoke all on function public.assign_document_version_number() from public;
revoke all on function public.prevent_document_security_field_changes() from public;
revoke all on function public.finalize_document_version(uuid, bigint, text) from public;
grant execute on function public.finalize_document_version(uuid, bigint, text) to authenticated;

create trigger documents_set_creator before insert on public.documents
  for each row execute function public.set_document_creator();
create trigger documents_validate_relationships before insert or update on public.documents
  for each row execute function public.validate_document_relationships();
create trigger documents_prevent_security_field_changes before update on public.documents
  for each row execute function public.prevent_document_security_field_changes();
create trigger document_versions_set_uploader before insert on public.document_versions
  for each row execute function public.set_document_version_uploader();
create trigger document_versions_assign_number before insert on public.document_versions
  for each row execute function public.assign_document_version_number();

grant select, insert, update (document_type_id, customer_id, company_id, branch_id, document_number, display_name, issued_on, expires_on, status, reminder_thresholds, notes, archived_at) on public.documents to authenticated;
grant select, insert on public.document_versions to authenticated;

alter table public.document_versions enable row level security;

create policy documents_insert_owner on public.documents for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy documents_update_owner on public.documents for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));
create policy document_versions_select_owner on public.document_versions for select to authenticated
  using ((select security.is_organization_owner(organization_id)));
create policy document_versions_insert_owner on public.document_versions for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
