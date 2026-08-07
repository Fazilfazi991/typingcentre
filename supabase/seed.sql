-- Safe local development data only. No auth.users records or production credentials are seeded.
-- The CRM creator triggers require an authenticated user. Local seed data deliberately has no auth.users records.
alter table public.companies disable trigger companies_set_creator;
alter table public.branches disable trigger branches_set_creator;
alter table public.customers disable trigger customers_set_creator;
insert into public.organizations (id, name, slug, location, primary_color) values
  ('10000000-0000-4000-8000-000000000001', 'Al Noor Typing Centre', 'al-noor-typing-centre', 'Dubai', '#2563EB'),
  ('10000000-0000-4000-8000-000000000002', 'Smart Documents Services', 'smart-documents-services', 'Sharjah', '#059669'),
  ('10000000-0000-4000-8000-000000000003', 'Emirates Business Hub', 'emirates-business-hub', 'Abu Dhabi', '#7C3AED')
on conflict (id) do nothing;

insert into public.organization_subscriptions (id, organization_id, plan, status, storage_quota_bytes, document_quota) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'business', 'active', 53687091200, null),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'starter', 'trial', 10737418240, 500),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'pro', 'active', 107374182400, null)
on conflict (organization_id) do nothing;

insert into public.branches (id, organization_id, name, city, phone) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Dubai Main', 'Dubai', '+971 4 555 0101'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Sharjah Main', 'Sharjah', '+971 6 555 0102'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Abu Dhabi Main', 'Abu Dhabi', '+971 2 555 0103')
on conflict (organization_id, name) do nothing;

insert into public.organization_document_types (id, organization_id, name) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Residence Visa'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Trade Licence'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Residence Visa'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Residence Visa')
on conflict (organization_id, name) do nothing;

insert into public.companies (id, organization_id, branch_id, name, licence_number, contact_name, contact_phone, city) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Bright Star Services', 'TL-AN-001', 'Ahmed Hassan', '+971 50 555 0101', 'Dubai'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Smart Ventures LLC', 'TL-SD-001', 'Maria Santos', '+971 50 555 0102', 'Sharjah'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Emirates Trade Hub', 'TL-EH-001', 'Mohammed Sameer', '+971 50 555 0103', 'Abu Dhabi')
on conflict (organization_id, licence_number) do nothing;

insert into public.customers (id, organization_id, company_id, branch_id, full_name, phone, nationality) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Ahmed Hassan', '+971 50 555 0101', 'Egyptian'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Maria Santos', '+971 50 555 0102', 'Filipino'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Mohammed Sameer', '+971 50 555 0103', 'Indian')
on conflict (id) do nothing;

insert into public.documents (id, organization_id, document_type_id, customer_id, company_id, branch_id, document_number, issued_on, expires_on, status) values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'AN-VISA-001', '2025-08-01', '2026-08-03', 'expired'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', null, '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'AN-LIC-001', '2025-08-01', '2026-08-10', 'urgent'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'SD-VISA-001', '2025-08-01', '2026-09-01', 'expiring_soon')
on conflict (id) do nothing;

insert into public.renewals (id, organization_id, document_id, status, started_at, notes) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'in_progress', timezone('utc', now()), 'Demo renewal')
on conflict (id) do nothing;

insert into public.follow_ups (id, organization_id, customer_id, document_id, due_at, status, note) values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', timezone('utc', now()) + interval '1 day', 'pending', 'Contact regarding visa renewal')
on conflict (id) do nothing;

-- Local-only visual QA batch for Al Noor Typing Centre. Values are fictional and the dates stay useful over time.
insert into public.organization_document_types (id, organization_id, name) values
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Passport'),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Emirates ID'),
  ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Labour Card'),
  ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Medical Insurance')
on conflict (organization_id, name) do nothing;

insert into public.companies (id, organization_id, branch_id, name, licence_number, contact_name, contact_phone, contact_email, city) values
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Pearl Business Setup', 'DEMO-AN-004', 'John Mathew', '+971 50 000 0404', 'pearl@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Metroline Restaurant LLC', 'DEMO-AN-005', 'Fathima Noor', '+971 50 000 0505', 'metroline@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Gulf Gate Documents Clearing', 'DEMO-AN-006', 'Mohammed Sameer', '+971 50 000 0606', 'gulf-gate@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Blue Ocean Cargo Services', 'DEMO-AN-007', 'Sara Khan', '+971 50 000 0707', 'blue-ocean@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Smart IT Solutions LLC', 'DEMO-AN-008', 'Ravi Kumar', '+971 50 000 0808', 'smart-it@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Desert Rose Typing Centre', 'DEMO-AN-009', 'Aisha Rahman', '+971 50 000 0909', 'desert-rose@demo.renewtrack.invalid', 'Dubai'),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Sameer Labour Supply', 'DEMO-AN-010', 'Sajid Bukhari', '+971 50 000 1010', 'sameer-labour@demo.renewtrack.invalid', 'Dubai')
on conflict (organization_id, licence_number) do nothing;

insert into public.customers (id, organization_id, company_id, branch_id, full_name, email, phone, nationality) values
  ('60000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','John Mathew','john.mathew@demo.renewtrack.invalid','+971 50 000 1004','Indian'),
  ('60000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Fathima Noor','fathima.noor@demo.renewtrack.invalid','+971 50 000 1005','Indian'),
  ('60000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','Mohammed Sameer','mohammed.sameer@demo.renewtrack.invalid','+971 50 000 1006','Indian'),
  ('60000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','Sara Khan','sara.khan@demo.renewtrack.invalid','+971 50 000 1007','Pakistani'),
  ('60000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000001','Ravi Kumar','ravi.kumar@demo.renewtrack.invalid','+971 50 000 1008','Indian'),
  ('60000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000001','Aisha Rahman','aisha.rahman@demo.renewtrack.invalid','+971 50 000 1009','Emirati'),
  ('60000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000001','Sajid Bukhari','sajid.bukhari@demo.renewtrack.invalid','+971 50 000 1010','Pakistani'),
  ('60000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Lina Sharif','lina.sharif@demo.renewtrack.invalid','+971 50 000 1011','Jordanian'),
  ('60000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Rakesh Kumar','rakesh.kumar@demo.renewtrack.invalid','+971 50 000 1012','Indian'),
  ('60000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','Noor Al Zahra','noor.alzahra@demo.renewtrack.invalid','+971 50 000 1013','Emirati'),
  ('60000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','Omar Farooq','omar.farooq@demo.renewtrack.invalid','+971 50 000 1014','Pakistani'),
  ('60000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000001','Shilpa Nair','shilpa.nair@demo.renewtrack.invalid','+971 50 000 1015','Indian'),
  ('60000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000001','Khalid Jassim','khalid.jassim@demo.renewtrack.invalid','+971 50 000 1016','Emirati'),
  ('60000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000001','Maria Santos','maria.santos@demo.renewtrack.invalid','+971 50 000 1017','Filipino')
on conflict (id) do nothing;

insert into public.documents (id, organization_id, document_type_id, customer_id, company_id, branch_id, document_number, issued_on, expires_on, status)
select ('70000000-0000-4000-8000-' || lpad((n + 3)::text, 12, '0'))::uuid, '10000000-0000-4000-8000-000000000001',
  ('40000000-0000-4000-8000-' || lpad((((n - 1) % 4) + 5)::text, 12, '0'))::uuid,
  ('60000000-0000-4000-8000-' || lpad((((n - 1) % 7) + 4)::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad((((n - 1) % 7) + 4)::text, 12, '0'))::uuid, '30000000-0000-4000-8000-000000000001',
  'DEMO-AN-DOC-' || lpad(n::text, 3, '0'), current_date - interval '1 year',
  case when n <= 5 then current_date - n when n <= 11 then current_date + (n - 5) when n <= 21 then current_date + (n - 3) else current_date + (n + 45) end,
  case when n >= 33 then 'renewal_in_progress'::public.document_status when n <= 5 then 'expired'::public.document_status when n <= 11 then 'urgent'::public.document_status else 'valid'::public.document_status end
from generate_series(1, 36) as n
on conflict (organization_id, document_number) do nothing;

insert into public.renewals (id, organization_id, document_id, status, started_at, notes) values
  ('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000033','in_progress',timezone('utc',now()),'Demo renewal in progress'),
  ('80000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000034','in_progress',timezone('utc',now()),'Demo renewal in progress'),
  ('80000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000035','submitted',timezone('utc',now()),'Demo renewal submitted'),
  ('80000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000036','in_progress',timezone('utc',now()),'Demo renewal in progress')
on conflict (id) do nothing;

insert into public.follow_ups (id, organization_id, customer_id, document_id, due_at, status, completed_at, note) values
  ('90000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004','70000000-0000-4000-8000-000000000004',date_trunc('day',now()) + interval '9 hours 30 minutes','pending',null,'Passport document collection'),
  ('90000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000005','70000000-0000-4000-8000-000000000005',date_trunc('day',now()) + interval '11 hours','pending',null,'Trade licence reminder'),
  ('90000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000006','70000000-0000-4000-8000-000000000006',date_trunc('day',now()) + interval '12 hours 30 minutes','pending',null,'Labour card renewal'),
  ('90000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000007','70000000-0000-4000-8000-000000000007',date_trunc('day',now()) + interval '14 hours','pending',null,'Emirates ID expiry call'),
  ('90000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000008','70000000-0000-4000-8000-000000000008',date_trunc('day',now()) + interval '15 hours 30 minutes','pending',null,'Medical insurance follow-up'),
  ('90000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000009','70000000-0000-4000-8000-000000000009',date_trunc('day',now()) + interval '17 hours','completed',timezone('utc',now()),'Residence visa renewal completed')
on conflict (id) do nothing;

insert into public.activity_logs (id, organization_id, entity_type, entity_id, message, created_at)
select ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, '10000000-0000-4000-8000-000000000001', 'document', ('70000000-0000-4000-8000-' || lpad((n + 3)::text, 12, '0'))::uuid,
  case n when 1 then 'Visa reminder sent to Ahmed Hassan' when 2 then 'Medical insurance renewed for Maria Santos' when 3 then 'New customer Ravi Kumar added' when 4 then 'Trade licence updated for Bright Star Services' else 'Renewal started for a demo document' end,
  timezone('utc',now()) - (n || ' hours')::interval from generate_series(1, 12) as n
on conflict (id) do nothing;

alter table public.companies enable trigger companies_set_creator;
alter table public.branches enable trigger branches_set_creator;
alter table public.customers enable trigger customers_set_creator;
