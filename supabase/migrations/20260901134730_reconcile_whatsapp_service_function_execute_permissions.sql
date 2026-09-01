-- Reconcile production privilege drift with canonical service-only access.
revoke execute on function public.claim_whatsapp_expiry_notification(
  uuid, date, text, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_expiry_notification(
  uuid, date, text, text, text, integer, integer, integer, integer
) to service_role;

revoke execute on function public.record_whatsapp_delivery_status(
  text, text, timestamptz, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_whatsapp_delivery_status(
  text, text, timestamptz, integer, text, text, text
) to service_role;
