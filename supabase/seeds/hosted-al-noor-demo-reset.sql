-- MANUAL HOSTED QA CLEANUP: run only in the Supabase SQL Editor for the fictional Al Noor tenant.
-- Removes only records created by hosted-al-noor-demo.sql. It leaves shared document types and all other tenant data intact.
begin;

do $$
declare
  target_organization_id uuid;
begin
  select id into target_organization_id from public.organizations where slug = 'al-noor-typing-centre';
  if target_organization_id is null then raise exception 'Al Noor QA tenant was not found'; end if;

  delete from public.activity_logs
    where organization_id = target_organization_id and message = 'QA demo activity: document review updated';
  delete from public.follow_ups
    where organization_id = target_organization_id and note = 'QA demo follow-up';
  delete from public.documents
    where organization_id = target_organization_id and document_number like 'QA-DEMO-DOC-%';
  delete from public.customers
    where organization_id = target_organization_id and notes = 'Hosted QA demo record' and email like '%@demo.renewtrack.invalid';
  delete from public.companies
    where organization_id = target_organization_id and licence_number like 'QA-DEMO-%';
end $$;

commit;
