-- Stage 3: atomically promote one verified, resolved pending scan into the
-- existing documents/document_versions model. The browser never supplies owner,
-- tenant, object key, or document type authority.
create or replace function public.finalize_pending_scan(
  target_pending_scan_id uuid,
  review_display_name text,
  review_document_number text,
  review_issue_date date,
  review_expiry_date date,
  review_extraction_data jsonb
)
returns table (document_id uuid, version_id uuid, already_finalized boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending public.pending_scans%rowtype;
  created_document_id uuid;
  created_version_id uuid := gen_random_uuid();
begin
  select * into pending
  from public.pending_scans
  where id = target_pending_scan_id and organization_id in (
    select organization_id from public.organization_memberships
    where user_id = (select auth.uid()) and role = 'owner' and status = 'active'
  )
  for update;
  if not found then raise exception 'Pending scan is unavailable'; end if;

  if pending.state = 'confirmed' then
    select current_version_id into created_version_id from public.documents
    where id = pending.confirmed_document_id and organization_id = pending.organization_id;
    return query select pending.confirmed_document_id, created_version_id, true;
    return;
  end if;

  if pending.state <> 'classified' or pending.detected_document_type_id is null
    or pending.object_key is null or pending.mime_type is null or pending.expected_size_bytes is null
    or (pending.customer_id is null and pending.company_id is null) then
    raise exception 'Pending scan is not ready to save';
  end if;
  if review_display_name is null or char_length(trim(review_display_name)) < 2 then
    raise exception 'Document name is required';
  end if;
  if review_issue_date is not null and review_expiry_date is not null and review_issue_date >= review_expiry_date then
    raise exception 'Expiry date must be after issue date';
  end if;

  insert into public.documents (
    organization_id, document_type_id, customer_id, company_id, display_name,
    document_number, issued_on, expires_on, status, extraction_status, extraction_data
  ) values (
    pending.organization_id, pending.detected_document_type_id, pending.customer_id, pending.company_id,
    trim(review_display_name), nullif(trim(review_document_number), ''), review_issue_date, review_expiry_date,
    'valid', 'confirmed', coalesce(review_extraction_data, '{}'::jsonb)
  ) returning id into created_document_id;

  insert into public.document_versions (
    id, organization_id, document_id, version_number, object_key, original_filename, stored_filename,
    mime_type, expected_mime_type, expected_size_bytes, file_size_bytes, upload_status, finalized_at,
    cleanup_eligible_at
  ) values (
    created_version_id, pending.organization_id, created_document_id, 1, pending.object_key,
    pending.original_filename, created_version_id::text || '.' || split_part(pending.mime_type, '/', 2),
    pending.mime_type, pending.mime_type, pending.expected_size_bytes, pending.expected_size_bytes,
    'complete', timezone('utc', now()), null
  );

  update public.documents set current_version_id = created_version_id
  where id = created_document_id and organization_id = pending.organization_id;
  update public.organization_usage_counters
  set stored_bytes = stored_bytes + pending.expected_size_bytes,
      document_count = document_count + 1, updated_at = timezone('utc', now())
  where organization_id = pending.organization_id;
  update public.pending_scans
  set state = 'confirmed', confirmed_document_id = created_document_id, confirmed_at = timezone('utc', now()),
      extraction_data = coalesce(review_extraction_data, extraction_data)
  where id = pending.id and organization_id = pending.organization_id;
  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message, metadata)
  values (pending.organization_id, (select auth.uid()), 'document', created_document_id,
    'Quick Scan document saved', jsonb_build_object('version_id', created_version_id, 'pending_scan_id', pending.id));

  return query select created_document_id, created_version_id, false;
end;
$$;

revoke all on function public.finalize_pending_scan(uuid, text, text, date, date, jsonb) from public;
grant execute on function public.finalize_pending_scan(uuid, text, text, date, date, jsonb) to authenticated;
