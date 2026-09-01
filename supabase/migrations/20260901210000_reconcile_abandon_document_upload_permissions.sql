revoke all on function public.abandon_document_upload(uuid) from public;
revoke all on function public.abandon_document_upload(uuid) from anon;
revoke all on function public.abandon_document_upload(uuid) from service_role;
grant execute on function public.abandon_document_upload(uuid) to authenticated;
