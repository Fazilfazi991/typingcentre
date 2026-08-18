-- Private, tenant-scoped staging metadata. Final document versions remain untouched.
alter table public.pending_scans
  add column object_key text,
  add column original_filename text,
  add column mime_type text check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  add column expected_size_bytes bigint check (expected_size_bytes > 0),
  add column uploaded_at timestamptz,
  add constraint pending_scans_uploaded_metadata_check check (
    (state = 'uploaded' and object_key is not null and original_filename is not null and mime_type is not null and expected_size_bytes is not null and uploaded_at is not null)
    or state <> 'uploaded'
  );

create unique index pending_scans_object_key_unique on public.pending_scans(object_key) where object_key is not null;
grant update (state, detected_canonical_code, detected_document_type_id, extraction_data, confirmed_document_id, confirmed_at, object_key, original_filename, mime_type, expected_size_bytes, uploaded_at) on public.pending_scans to authenticated;
