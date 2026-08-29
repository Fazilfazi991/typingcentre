-- MANUAL HOSTED QA SEED: run only in the Supabase SQL Editor for the fictional dedicated Note It demo tenant.
-- It aborts unless the existing dedicated Note It demo tenant has exactly one active primary owner membership.
-- It never creates Auth users, changes RLS, or touches another organisation.
begin;

do $$
declare
  target_organization_id uuid;
  target_owner_id uuid;
begin
  select id into target_organization_id from public.organizations where slug = 'note-it-demo';
  if target_organization_id is null then raise exception 'dedicated Note It demo tenant was not found'; end if;
  select user_id into strict target_owner_id from public.organization_memberships
    where organization_id = target_organization_id and is_primary_owner and status = 'active';
  perform set_config('request.jwt.claim.sub', target_owner_id::text, true);

  insert into public.organization_document_types (organization_id, name, canonical_code, is_active)
  select target_organization_id, name, canonical_code, true from (values
    ('Emirates ID','emirates_id'),('Passport','passport'),('Driving Licence','driving_licence'),
    ('Residence Visa','residence_visa'),('Visit Visa','visit_visa'),('Employment Visa','employment_visa'),
    ('Family Visa','family_visa'),('Golden Visa','golden_visa'),('Labour Card','labour_card'),
    ('Work Permit','work_permit'),('Medical Insurance','medical_insurance'),('Health Card','health_card'),
    ('Medical Fitness Certificate','medical_fitness_certificate'),('Birth Certificate',null),
    ('Marriage Certificate',null),('Educational Certificate',null),('Police Clearance Certificate',null),
    ('Vehicle Registration / Mulkiya','vehicle_registration'),('Vehicle Insurance','vehicle_insurance'),
    ('Vehicle Testing Certificate',null),('Trade Licence','trade_licence'),('Establishment Card','establishment_card'),
    ('Immigration Card','immigration_card'),('MOHRE Establishment Card','mohre_establishment_card'),
    ('Chamber of Commerce Certificate','chamber_certificate'),('VAT / Tax Registration','vat_tax_registration'),
    ('Memorandum of Association','memorandum_of_association'),('Company Certificate',null),
    ('Tenancy Contract / Ejari','tenancy_contract'),('NOC','noc'),('Power of Attorney','power_of_attorney'),('Other','other')
  ) as demo(name, canonical_code)
  on conflict (organization_id, name) do update
    set is_active = true, canonical_code = excluded.canonical_code;

  insert into public.companies (organization_id, name, licence_number, contact_name, contact_phone, contact_email, city)
  select target_organization_id, name, licence, contact, phone, lower(replace(name, ' ', '.')) || '@demo.renewtrack.invalid', 'Dubai'
  from (values
    ('Pearl Business Setup','QA-DEMO-001','John Mathew','+971 50 000 1001'),
    ('Metroline Restaurant LLC','QA-DEMO-002','Fathima Noor','+971 50 000 1002'),
    ('Gulf Gate Documents Clearing','QA-DEMO-003','Mohammed Sameer','+971 50 000 1003'),
    ('Blue Ocean Cargo Services','QA-DEMO-004','Sara Khan','+971 50 000 1004'),
    ('Smart IT Solutions LLC','QA-DEMO-005','Ravi Kumar','+971 50 000 1005'),
    ('Desert Rose Typing Centre','QA-DEMO-006','Aisha Rahman','+971 50 000 1006'),
    ('Sameer Labour Supply','QA-DEMO-007','Sajid Bukhari','+971 50 000 1007')
  ) as demo(name, licence, contact, phone)
  where not exists (select 1 from public.companies c where c.organization_id = target_organization_id and c.licence_number = demo.licence);

  with demo(full_name, phone, nationality, company_licence) as (
    values
      ('Ahmed Hassan','+971 50 000 1101','Egyptian','QA-DEMO-001'),('Fathima Noor','+971 50 000 1102','Indian','QA-DEMO-002'),('Mohammed Sameer','+971 50 000 1103','Indian','QA-DEMO-003'),
      ('John Mathew','+971 50 000 1104','Indian','QA-DEMO-004'),('Maria Santos','+971 50 000 1105','Filipino','QA-DEMO-005'),('Ravi Kumar','+971 50 000 1106','Indian','QA-DEMO-006'),
      ('Sara Khan','+971 50 000 1107','Pakistani','QA-DEMO-007'),('Omar Farooq','+971 50 000 1108','Pakistani','QA-DEMO-001'),('Shilpa Nair','+971 50 000 1109','Indian','QA-DEMO-002'),
      ('Khalid Jassim','+971 50 000 1110','Emirati','QA-DEMO-003'),('Aisha Rahman','+971 50 000 1111','Emirati','QA-DEMO-004'),('Sajid Bukhari','+971 50 000 1112','Pakistani','QA-DEMO-005'),
      ('Lina Sharif','+971 50 000 1113','Jordanian','QA-DEMO-006'),('Rakesh Kumar','+971 50 000 1114','Indian','QA-DEMO-007'),('Noor Al Zahra','+971 50 000 1115','Emirati','QA-DEMO-001')
  )
  insert into public.customers (organization_id, company_id, full_name, email, phone, nationality, notes)
  select target_organization_id,
    (select id from public.companies where organization_id = target_organization_id and licence_number = demo.company_licence),
    demo.full_name, lower(replace(demo.full_name, ' ', '.')) || '@demo.renewtrack.invalid', demo.phone, demo.nationality, 'Public Note It demo record'
  from demo
  where not exists (select 1 from public.customers c where c.organization_id = target_organization_id and c.email = lower(replace(demo.full_name, ' ', '.')) || '@demo.renewtrack.invalid');

  insert into public.documents (organization_id, document_type_id, customer_id, display_name, document_number, issued_on, expires_on, status, notes)
  select target_organization_id,
    (select id from public.organization_document_types where organization_id = target_organization_id and name = case ((n - 1) % 8)
      when 0 then 'Emirates ID' when 1 then 'Passport' when 2 then 'Trade Licence' when 3 then 'Establishment Card'
      when 4 then 'Residence Visa' when 5 then 'Labour Card' when 6 then 'Medical Insurance' else 'Tenancy Contract / Ejari' end),
    (select id from public.customers where organization_id = target_organization_id and email like '%@demo.renewtrack.invalid' order by email offset ((n - 1) % 15) limit 1),
    case ((n - 1) % 8)
      when 0 then 'Emirates ID' when 1 then 'Passport' when 2 then 'Trade Licence' when 3 then 'Establishment Card'
      when 4 then 'Residence Visa' when 5 then 'Labour Card' when 6 then 'Medical Insurance' else 'Tenancy Contract / Ejari' end,
    'QA-DEMO-DOC-' || lpad(n::text, 3, '0'), current_date - interval '1 year',
    case when n <= 5 then current_date - n when n = 6 then current_date when n <= 11 then current_date + (n - 6) when n <= 21 then current_date + (n - 3) else current_date + (n + 45) end,
    case when n >= 33 then 'renewal_in_progress'::public.document_status when n <= 5 then 'expired'::public.document_status when n <= 11 then 'urgent'::public.document_status else 'valid'::public.document_status end,
    'Public Note It demo record'
  from generate_series(1, 36) as n
  where not exists (select 1 from public.documents d where d.organization_id = target_organization_id and d.document_number = 'QA-DEMO-DOC-' || lpad(n::text, 3, '0'));

  insert into public.renewals (organization_id, document_id, status, started_at, notes)
  select target_organization_id, id, case when document_number = 'QA-DEMO-DOC-035' then 'submitted'::public.renewal_status else 'in_progress'::public.renewal_status end, timezone('utc', now()), 'Public Note It demo renewal'
  from public.documents d where d.organization_id = target_organization_id and d.document_number in ('QA-DEMO-DOC-033','QA-DEMO-DOC-034','QA-DEMO-DOC-035','QA-DEMO-DOC-036')
    and not exists (select 1 from public.renewals r where r.organization_id = target_organization_id and r.document_id = d.id);

  insert into public.follow_ups (organization_id, customer_id, document_id, due_at, status, completed_at, note)
  select target_organization_id, d.customer_id, d.id,
    case when n <= 2 then date_trunc('day', now()) + make_interval(hours => 9 + n)
      when n <= 5 then date_trunc('day', now()) + make_interval(days => n - 2, hours => 10)
      else date_trunc('day', now()) - interval '1 day' end,
    case when n = 6 then 'completed'::public.follow_up_status else 'pending'::public.follow_up_status end,
    case when n = 6 then timezone('utc', now()) else null end, 'QA demo follow-up'
  from generate_series(1, 6) as n join public.documents d on d.organization_id = target_organization_id and d.document_number = 'QA-DEMO-DOC-' || lpad(n::text, 3, '0')
  where not exists (select 1 from public.follow_ups f where f.organization_id = target_organization_id and f.note = 'QA demo follow-up' and f.document_id = d.id);

  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  select target_organization_id, target_owner_id, 'document', d.id, 'QA demo activity: document review updated'
  from public.documents d where d.organization_id = target_organization_id and d.document_number like 'QA-DEMO-DOC-%'
  and not exists (select 1 from public.activity_logs a where a.organization_id = target_organization_id and a.entity_id = d.id and a.message = 'QA demo activity: document review updated')
  limit 12;
end $$;

commit;
