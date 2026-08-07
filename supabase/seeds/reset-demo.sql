-- Local-only reset for the visual QA records appended to supabase/seed.sql.
-- Never run this against a hosted project.
begin;
delete from public.activity_logs where id::text like 'a0000000-0000-4000-8000-%';
delete from public.follow_ups where id in (
  '90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003',
  '90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000005',
  '90000000-0000-4000-8000-000000000006','90000000-0000-4000-8000-000000000007'
);
delete from public.documents where organization_id = '10000000-0000-4000-8000-000000000001' and document_number like 'DEMO-AN-DOC-%';
delete from public.customers where email like '%@demo.renewtrack.invalid';
delete from public.companies where licence_number like 'DEMO-AN-%';
delete from public.organization_document_types where organization_id = '10000000-0000-4000-8000-000000000001' and name in ('Passport', 'Emirates ID', 'Labour Card', 'Medical Insurance');
commit;
