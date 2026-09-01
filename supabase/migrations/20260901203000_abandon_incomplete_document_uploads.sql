-- Failed direct-to-storage uploads must not leave visible, numberless document rows.
-- Only non-finalized versions can be abandoned. The parent is removed only when
-- it has never owned a completed version, so existing document history is safe.
create or replace function public.abandon_document_upload(target_version_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.document_versions%rowtype;
  target_document public.documents%rowtype;
begin
  select * into target
  from public.document_versions
  where id = target_version_id
    and organization_id in (
      select organization_id
      from public.organization_memberships
      where user_id = (select auth.uid())
        and role = 'owner'
        and status = 'active'
    )
  for update;

  if not found then
    raise exception 'Document upload is unavailable';
  end if;
  if target.upload_status = 'complete' then
    raise exception 'Completed document uploads cannot be abandoned';
  end if;

  select * into target_document
  from public.documents
  where id = target.document_id
    and organization_id = target.organization_id
  for update;

  delete from public.document_versions
  where id = target.id and upload_status <> 'complete';

  if target_document.current_version_id is null
     and not exists (
       select 1 from public.document_versions
       where document_id = target_document.id
     ) then
    delete from public.documents
    where id = target_document.id
      and organization_id = target.organization_id
      and current_version_id is null;
  end if;

  return target.object_key;
end;
$$;

revoke all on function public.abandon_document_upload(uuid) from public;
grant execute on function public.abandon_document_upload(uuid) to authenticated;
