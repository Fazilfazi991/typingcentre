-- Reconcile the access model established for the isolated platform WhatsApp QA
-- delivery ledger. The SECURITY DEFINER function is an internal webhook path;
-- it must not be callable through browser roles or PUBLIC.
revoke all on function public.record_platform_whatsapp_qa_delivery_status(
  text, text, timestamptz, integer, text, text, text
) from public;
revoke all on function public.record_platform_whatsapp_qa_delivery_status(
  text, text, timestamptz, integer, text, text, text
) from anon, authenticated;
grant execute on function public.record_platform_whatsapp_qa_delivery_status(
  text, text, timestamptz, integer, text, text, text
) to service_role;

-- Preserve platform-admin read access through its RLS policy, while removing
-- the unexpected browser-role write privileges from the QA-send ledger.
revoke all on table public.platform_whatsapp_qa_sends from anon, authenticated;
grant select on table public.platform_whatsapp_qa_sends to authenticated;
grant all on table public.platform_whatsapp_qa_sends to service_role;
