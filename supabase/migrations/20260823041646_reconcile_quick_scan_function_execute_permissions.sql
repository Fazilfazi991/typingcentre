-- Reconcile the live grants with the original Quick Scan migration intent.
-- These SECURITY DEFINER functions must never be callable by anon or PUBLIC.
revoke execute on function public.set_pending_scan_creator() from public;
revoke execute on function public.set_pending_scan_creator() from anon;
grant execute on function public.set_pending_scan_creator() to authenticated, service_role;

revoke execute on function public.finalize_pending_scan(uuid, text, text, date, date, jsonb) from public;
revoke execute on function public.finalize_pending_scan(uuid, text, text, date, date, jsonb) from anon;
grant execute on function public.finalize_pending_scan(uuid, text, text, date, date, jsonb) to authenticated, service_role;
