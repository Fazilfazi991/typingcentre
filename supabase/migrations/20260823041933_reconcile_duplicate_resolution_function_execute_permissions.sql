-- Reconcile the live grant with the original duplicate-resolution migration intent.
-- This SECURITY DEFINER RPC must not be callable by anon or PUBLIC.
revoke execute on function public.replace_document_from_upload(uuid, uuid, uuid, text, text, date, date, jsonb) from public;
revoke execute on function public.replace_document_from_upload(uuid, uuid, uuid, text, text, date, date, jsonb) from anon;
grant execute on function public.replace_document_from_upload(uuid, uuid, uuid, text, text, date, date, jsonb) to authenticated, service_role;
