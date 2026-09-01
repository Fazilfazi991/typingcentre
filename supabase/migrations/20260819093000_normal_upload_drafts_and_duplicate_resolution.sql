-- Draft uploads do not have a canonical document number until review.  The
-- original NULLS NOT DISTINCT constraint allowed only one draft per workspace.
alter table public.documents
  drop constraint if exists documents_organization_id_document_number_key;

create unique index if not exists documents_organization_document_number_unique
  on public.documents (organization_id, document_number)
  where document_number is not null and btrim(document_number) <> '';

-- Move a reviewed draft upload onto the matching canonical document without
-- losing either the previous file history or the uploaded replacement file.
create or replace function public.replace_document_from_upload(
  draft_document_id uuid,
  existing_document_id uuid,
  review_document_type_id uuid,
  review_display_name text,
  review_document_number text,
  review_issue_date date,
  review_expiry_date date,
  review_extraction_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  draft public.documents%rowtype;
  existing public.documents%rowtype;
  replacement_version_id uuid;
  next_version_number integer;
begin
  select organization_id into target_organization_id
  from public.organization_memberships
  where user_id = (select auth.uid())
    and is_primary_owner
    and status = 'active';

  if target_organization_id is null
     or not security.is_organization_owner(target_organization_id) then
    raise exception 'Active owner membership is required';
  end if;

  select * into draft from public.documents
  where id = draft_document_id and organization_id = target_organization_id and archived_at is null
  for update;
  select * into existing from public.documents
  where id = existing_document_id and organization_id = target_organization_id and archived_at is null
  for update;

  if draft.id is null or existing.id is null or draft.id = existing.id then
    raise exception 'Document is unavailable';
  end if;
  if draft.customer_id is distinct from existing.customer_id
     or draft.company_id is distinct from existing.company_id
     or draft.branch_id is distinct from existing.branch_id then
    raise exception 'The existing document belongs to a different owner';
  end if;
  if nullif(btrim(review_document_number), '') is null
     or existing.document_number is distinct from nullif(btrim(review_document_number), '') then
    raise exception 'The existing document no longer matches this document number';
  end if;
  if review_issue_date is not null and review_expiry_date is not null
     and review_expiry_date <= review_issue_date then
    raise exception 'Expiry date must be after issue date';
  end if;

  replacement_version_id := draft.current_version_id;
  if replacement_version_id is null or not exists (
    select 1 from public.document_versions
    where id = replacement_version_id and document_id = draft.id and upload_status = 'complete'
  ) then
    raise exception 'The uploaded replacement file is unavailable';
  end if;

  update public.documents set current_version_id = null
  where id = draft.id and organization_id = target_organization_id;
  select coalesce(max(version_number), 0) + 1 into next_version_number
  from public.document_versions where document_id = existing.id;
  update public.document_versions
  set document_id = existing.id, version_number = next_version_number
  where id = replacement_version_id and organization_id = target_organization_id;
  update public.documents
  set document_type_id = review_document_type_id,
      display_name = btrim(review_display_name),
      document_number = nullif(btrim(review_document_number), ''),
      issued_on = review_issue_date,
      expires_on = review_expiry_date,
      extraction_status = 'confirmed',
      extraction_data = review_extraction_data,
      current_version_id = replacement_version_id
  where id = existing.id and organization_id = target_organization_id;
  update public.documents
  set archived_at = timezone('utc', now())
  where id = draft.id and organization_id = target_organization_id;

  return existing.id;
end;
$$;

revoke all on function public.replace_document_from_upload(uuid, uuid, uuid, text, text, date, date, jsonb) from public;
grant execute on function public.replace_document_from_upload(uuid, uuid, uuid, text, text, date, date, jsonb) to authenticated;
