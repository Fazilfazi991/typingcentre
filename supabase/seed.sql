-- Safe local development data only. No auth.users records or production credentials are seeded.
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
