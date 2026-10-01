-- Rebuild fictional typing-centre operations whenever the shared demo resets.
create function security.seed_note_it_service_demo(target_organization_id uuid, target_owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare demo record; request_id uuid; customer_row record; service_row record; eid_id uuid; amount_due numeric(12,2);
begin
  -- Existing pgTAP reset fixture uses replica mode to omit Auth records.
  if current_setting('session_replication_role') = 'replica' then return; end if;
  if not exists (select 1 from public.organizations where id = target_organization_id and slug = 'note-it-demo')
     or not exists (select 1 from public.organization_memberships where organization_id = target_organization_id and user_id = target_owner_id and is_primary_owner and status = 'active')
  then raise exception 'Demo seed guard failed'; end if;
  perform set_config('request.jwt.claim.sub',target_owner_id::text,true);

  insert into public.companies(organization_id,name,licence_number,contact_name,contact_phone,city)
  select target_organization_id,'Pearl Business Setup LLC','DEMO-PEARL-001','Sample Office','+971 50 000 2101','Dubai'
  where not exists(select 1 from public.companies where organization_id = target_organization_id and (licence_number = 'DEMO-PEARL-001' or name = 'Pearl Business Setup'));
  insert into public.companies(organization_id,name,licence_number,contact_name,contact_phone,city)
  select target_organization_id,'Crescent Trading LLC','DEMO-CRESCENT-002','Sample Office','+971 50 000 2102','Dubai'
  where not exists(select 1 from public.companies where organization_id = target_organization_id and licence_number = 'DEMO-CRESCENT-002');

  insert into public.customers(organization_id,company_id,full_name,email,phone,nationality,notes)
  select target_organization_id,c.id,d.full_name,d.email,d.phone,d.nationality,'Fictional typing centre demo customer'
  from (values
    ('Ahmed Hassan','ahmed.hassan@demo.example.invalid','+971 50 000 2201','Egyptian','DEMO-PEARL-001'),
    ('Maya Ibrahim','maya.ibrahim@demo.example.invalid','+971 50 000 2202','Jordanian','DEMO-PEARL-001'),
    ('Omar Farooq','omar.farooq@demo.example.invalid','+971 50 000 2203','Pakistani','DEMO-CRESCENT-002'),
    ('Fatima Khan','fatima.khan@demo.example.invalid','+971 50 000 2204','Indian','DEMO-CRESCENT-002'),
    ('Ravi Kumar','ravi.kumar@demo.example.invalid','+971 50 000 2205','Indian','DEMO-PEARL-001'),
    ('Sara Ali','sara.ali@demo.example.invalid','+971 50 000 2206','Emirati','DEMO-PEARL-001'),
    ('Lina Sharif','lina.sharif@demo.example.invalid','+971 50 000 2207','Jordanian','DEMO-CRESCENT-002'),
    ('Youssef Nasser','youssef.nasser@demo.example.invalid','+971 50 000 2208','Egyptian','DEMO-CRESCENT-002')
  ) as d(full_name,email,phone,nationality,company_licence)
  join public.companies c on c.organization_id = target_organization_id and (c.licence_number = d.company_licence or (d.company_licence = 'DEMO-PEARL-001' and c.name = 'Pearl Business Setup'))
  where not exists(select 1 from public.customers existing where existing.organization_id = target_organization_id and (existing.email = d.email or existing.full_name = d.full_name));

  insert into public.services(organization_id,code,name,category,description,government_fee,service_fee,expected_days)
  select target_organization_id,d.code,d.name,d.category,'Fictional demo price. Configure actual fees for this workspace.',d.government_fee,d.service_fee,d.expected_days
  from (values
    ('VISA-RENEW','Residence Visa Renewal','Residency & Visa',850.00,220.00,5),
    ('EID-RENEW','Emirates ID Renewal','Emirates ID',370.00,90.00,4),
    ('WORK-PERMIT','Work Permit Application','MOHRE / Labour',1200.00,240.00,7),
    ('MED-FIT','Medical Fitness Test','Medical',320.00,80.00,2),
    ('TRADE-RENEW','Trade Licence Renewal','Company / Business',1500.00,350.00,10),
    ('DOC-ATTEST','Document Attestation','Documents',120.00,110.00,3),
    ('VISIT-VISA','Visit Visa Application','Residency & Visa',600.00,160.00,5)
  ) as d(code,name,category,government_fee,service_fee,expected_days)
  on conflict(organization_id,code) do update set name = excluded.name,category = excluded.category,description = excluded.description,
    government_fee = excluded.government_fee,service_fee = excluded.service_fee,expected_days = excluded.expected_days,is_active = true;

  insert into public.service_requirements(organization_id,service_id,name,document_type_id,required,sort_order)
  select target_organization_id,s.id,d.name,t.id,d.required,d.sort_order
  from (values
    ('VISA-RENEW','Passport',true,10),('VISA-RENEW','Emirates ID',true,20),
    ('EID-RENEW','Passport',true,10),('WORK-PERMIT','Passport',true,10),
    ('TRADE-RENEW','Trade Licence',true,10),('DOC-ATTEST','Original document',false,10),
    ('VISIT-VISA','Passport',true,10)
  ) as d(code,name,required,sort_order)
  join public.services s on s.organization_id = target_organization_id and s.code = d.code
  left join public.organization_document_types t on t.organization_id = target_organization_id and t.name = d.name
  where not exists(select 1 from public.service_requirements r where r.organization_id = target_organization_id and r.service_id = s.id and r.name = d.name);

  select d.id into eid_id from public.documents d where d.organization_id = target_organization_id and d.document_number = 'DEMO-SR-EID-001';
  if eid_id is null then
    insert into public.documents(organization_id,document_type_id,customer_id,display_name,document_number,issued_on,expires_on,status,notes)
    select target_organization_id,t.id,c.id,'Emirates ID','DEMO-SR-EID-001',current_date-65,current_date+300,'valid','Fictional document for the service request demo'
    from public.organization_document_types t,public.customers c
    where t.organization_id = target_organization_id and t.name = 'Emirates ID'
      and c.organization_id = target_organization_id and c.full_name = 'Ahmed Hassan'
    returning id into eid_id;
  end if;

  for demo in select * from (values
    ('ahmed.hassan@demo.example.invalid','VISA-RENEW','waiting_documents','DEMO-SR-001',300.00),
    ('maya.ibrahim@demo.example.invalid','EID-RENEW','waiting_documents','DEMO-SR-002',0.00),
    ('omar.farooq@demo.example.invalid','WORK-PERMIT','waiting_documents','DEMO-SR-003',0.00),
    ('fatima.khan@demo.example.invalid','MED-FIT','processing','DEMO-SR-004',200.00),
    ('ravi.kumar@demo.example.invalid','TRADE-RENEW','processing','DEMO-SR-005',500.00),
    ('sara.ali@demo.example.invalid','DOC-ATTEST','processing','DEMO-SR-006',0.00),
    ('lina.sharif@demo.example.invalid','VISIT-VISA','processing','DEMO-SR-007',350.00),
    ('youssef.nasser@demo.example.invalid','EID-RENEW','ready_for_collection','DEMO-SR-008',460.00),
    ('maya.ibrahim@demo.example.invalid','MED-FIT','ready_for_collection','DEMO-SR-009',400.00),
    ('omar.farooq@demo.example.invalid','VISIT-VISA','action_required','DEMO-SR-010',0.00),
    ('ravi.kumar@demo.example.invalid','WORK-PERMIT','action_required','DEMO-SR-011',300.00),
    ('fatima.khan@demo.example.invalid','DOC-ATTEST','completed','DEMO-SR-012',230.00),
    ('sara.ali@demo.example.invalid','MED-FIT','completed','DEMO-SR-013',400.00),
    ('ahmed.hassan@demo.example.invalid','DOC-ATTEST','new','DEMO-SR-014',0.00)
  ) as d(customer_email,service_code,target_status,seed_reference,payment_amount) loop
    select c.id,c.company_id into customer_row from public.customers c where c.organization_id = target_organization_id
      and (c.email = demo.customer_email or lower(c.full_name) = replace(split_part(demo.customer_email,'@',1),'.',' '))
    order by case when c.email = demo.customer_email then 0 else 1 end limit 1;
    select s.id,s.government_fee+s.service_fee as total into service_row from public.services s where s.organization_id = target_organization_id and s.code = demo.service_code;
    if customer_row.id is null or service_row.id is null then raise exception 'Demo customer or service missing: %',demo.seed_reference; end if;
    select id into request_id from public.service_requests where organization_id = target_organization_id and external_reference = demo.seed_reference;
    if request_id is null then
      insert into public.service_requests(organization_id,customer_id,company_id,service_id,assigned_to,source,external_reference,notes,priority)
      values(target_organization_id,customer_row.id,customer_row.company_id,service_row.id,target_owner_id,'other',demo.seed_reference,
        case when demo.seed_reference = 'DEMO-SR-001' then 'Passport is still missing. Scan it from this request to complete the checklist.' else 'Fictional counter service request' end,
        case when demo.target_status in ('waiting_documents','action_required') then 'high' else 'normal' end)
      returning id into request_id;

      if demo.seed_reference = 'DEMO-SR-001' and eid_id is not null then
        update public.service_request_requirements set document_id = eid_id,status = 'received'
        where organization_id = target_organization_id and service_request_id = request_id and name = 'Emirates ID';
      end if;
      if demo.target_status not in ('new','waiting_documents') then
        update public.service_request_requirements set status = 'not_required'
        where organization_id = target_organization_id and service_request_id = request_id and status = 'missing';
      end if;
      if demo.target_status = 'waiting_documents' then
        update public.service_requests set status = 'waiting_documents' where id = request_id;
      elsif demo.target_status <> 'new' then
        update public.service_requests set status = 'ready_to_submit' where id = request_id;
        update public.service_requests set status = 'submitted',application_reference = 'APP-' || demo.seed_reference where id = request_id;
        if demo.target_status <> 'submitted' then
          update public.service_requests set status = 'processing' where id = request_id;
          if demo.target_status = 'action_required' then update public.service_requests set status = 'action_required' where id = request_id; end if;
          if demo.target_status in ('ready_for_collection','completed') then
            update public.service_requests set status = 'ready_for_collection' where id = request_id;
            if demo.target_status = 'completed' then update public.service_requests set status = 'completed' where id = request_id; end if;
          end if;
        end if;
      end if;
      if demo.seed_reference = 'DEMO-SR-005' then update public.service_requests set expected_completion_at = now()-interval '2 days' where id = request_id; end if;
      amount_due := least(demo.payment_amount,service_row.total);
      if amount_due > 0 then
        insert into public.service_payments(organization_id,service_request_id,amount,method,reference,notes)
        values(target_organization_id,request_id,amount_due,'cash','DEMO-PAY-'||demo.seed_reference,'Fictional demo payment');
      end if;
    end if;
  end loop;

  insert into public.follow_ups(organization_id,customer_id,company_id,service_request_id,due_at,note)
  select target_organization_id,r.customer_id,r.company_id,r.id,now()+interval '3 hours','Call Ahmed about missing passport'
  from public.service_requests r where r.organization_id = target_organization_id and r.external_reference = 'DEMO-SR-001'
  and not exists(select 1 from public.follow_ups f where f.organization_id = target_organization_id and f.service_request_id = r.id and f.note = 'Call Ahmed about missing passport');
end $$;

revoke all on function security.seed_note_it_service_demo(uuid,uuid) from public,anon,authenticated;


-- Preserve the existing reset logic and add service request cleanup and reseeding.
create or replace function public.reset_note_it_demo_workspace()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_owner_id uuid;
  primary_owner_count integer;
  result jsonb;
begin
  select o.id into target_organization_id
  from public.organizations o
  where o.slug = 'note-it-demo' and o.status = 'active' and o.is_active = true;
  if target_organization_id is null then raise exception 'demo reset guard failed: active tenant not found'; end if;

  select count(*), min(m.user_id::text)::uuid into primary_owner_count, target_owner_id
  from public.organization_memberships m
  where m.organization_id = target_organization_id and m.is_primary_owner = true and m.status = 'active';
  if primary_owner_count <> 1 or target_owner_id is null then raise exception 'demo reset guard failed: expected one primary owner'; end if;
  perform set_config('request.jwt.claim.sub', target_owner_id::text, true);

  -- Remove tenant-owned visitor/generated rows in foreign-key-safe order. Identity,
  -- membership, subscription, document type configuration, and organization survive.
  delete from public.import_job_rows where organization_id = target_organization_id;
  delete from public.import_jobs where organization_id = target_organization_id;
  delete from public.pending_scans where organization_id = target_organization_id;
  delete from public.document_version_files where organization_id = target_organization_id;
  update public.documents set current_version_id = null where organization_id = target_organization_id;
  delete from public.document_versions where organization_id = target_organization_id;
  delete from public.whatsapp_notifications where organization_id = target_organization_id;
  delete from public.notification_logs where organization_id = target_organization_id;
  delete from public.notifications where organization_id = target_organization_id;
  delete from public.renewals where organization_id = target_organization_id;
  delete from public.follow_ups where organization_id = target_organization_id;
  delete from public.activity_logs where organization_id = target_organization_id;
  delete from public.audit_logs where organization_id = target_organization_id;
  delete from public.service_payments where organization_id = target_organization_id;
  delete from public.service_request_requirements where organization_id = target_organization_id;
  delete from public.service_requests where organization_id = target_organization_id;
  delete from public.service_requirements where organization_id = target_organization_id;
  delete from public.services where organization_id = target_organization_id;
  delete from public.service_request_counters where organization_id = target_organization_id;
  delete from public.documents where organization_id = target_organization_id;
  delete from public.customers where organization_id = target_organization_id;
  delete from public.companies where organization_id = target_organization_id;
  delete from public.branches where organization_id = target_organization_id;

  insert into public.organization_document_types (organization_id, name, canonical_code, is_active)
  select target_organization_id, name, code, true from (values
    ('Emirates ID','emirates_id'),('Passport','passport'),('Trade Licence','trade_licence'),('Establishment Card','establishment_card'),
    ('Residence Visa','residence_visa'),('Labour Card','labour_card'),('Medical Insurance','medical_insurance'),('Tenancy Contract / Ejari','tenancy_contract')
  ) as seed(name, code)
  on conflict (organization_id, name) do update set canonical_code = excluded.canonical_code, is_active = true;

  insert into public.companies (organization_id, name, licence_number, contact_name, contact_phone, contact_email, city)
  select target_organization_id, 'Demo Company ' || n, 'DEMO-LIC-' || lpad(n::text,3,'0'), 'Sample Contact ' || n,
    '+97100000' || lpad(n::text,4,'0'), 'company' || n || '@example.invalid', 'Dubai'
  from generate_series(1,8) n;

  insert into public.customers (organization_id, company_id, full_name, email, phone, nationality, notes)
  select target_organization_id,
    (select c.id from public.companies c where c.organization_id = target_organization_id order by c.licence_number offset ((n-1)%8) limit 1),
    'Sample Customer ' || lpad(n::text,2,'0'), 'customer' || n || '@example.invalid', '+97100001' || lpad(n::text,4,'0'),
    case (n%4) when 0 then 'Emirati' when 1 then 'Indian' when 2 then 'Filipino' else 'Pakistani' end, 'Synthetic public demo record'
  from generate_series(1,17) n;

  insert into public.documents (organization_id, document_type_id, customer_id, display_name, document_number, issued_on, expires_on, status, notes, created_by)
  select target_organization_id,
    (select t.id from public.organization_document_types t where t.organization_id=target_organization_id and t.name=(array['Emirates ID','Passport','Trade Licence','Establishment Card','Residence Visa','Labour Card','Medical Insurance','Tenancy Contract / Ejari'])[1+((n-1)%8)]),
    (select c.id from public.customers c where c.organization_id=target_organization_id order by c.email offset ((n-1)%17) limit 1),
    (array['Emirates ID','Passport','Trade Licence','Establishment Card','Residence Visa','Labour Card','Medical Insurance','Tenancy Contract / Ejari'])[1+((n-1)%8)],
    'DEMO-DOC-'||lpad(n::text,3,'0'), current_date - 365,
    current_date + case when n<=5 then -n when n=6 then 0 when n<=12 then n-6 when n<=24 then n-5 else n+35 end,
    case when n<=5 then 'expired'::public.document_status when n=6 then 'expires_today'::public.document_status when n<=12 then 'urgent'::public.document_status when n>=43 then 'renewal_in_progress'::public.document_status else 'valid'::public.document_status end,
    'Synthetic public demo record', target_owner_id
  from generate_series(1,46) n;

  insert into public.renewals (organization_id, document_id, status, started_at, notes)
  select target_organization_id, d.id, case when d.document_number='DEMO-DOC-046' then 'submitted'::public.renewal_status else 'in_progress'::public.renewal_status end,
    timezone('utc',now()), 'Synthetic public demo renewal'
  from public.documents d where d.organization_id=target_organization_id and d.document_number in ('DEMO-DOC-043','DEMO-DOC-044','DEMO-DOC-045','DEMO-DOC-046');

  insert into public.follow_ups (organization_id, customer_id, document_id, due_at, status, completed_at, note)
  select target_organization_id, d.customer_id, d.id,
    date_trunc('day',now()) + case when n<=2 then make_interval(days=>-n,hours=>10) when n=3 then make_interval(hours=>12) when n<=6 then make_interval(days=>n-3,hours=>10) else make_interval(days=>-1,hours=>9) end,
    case when n=7 then 'completed'::public.follow_up_status when n<=2 then 'overdue'::public.follow_up_status else 'pending'::public.follow_up_status end,
    case when n=7 then timezone('utc',now()) else null end, 'Synthetic demo follow-up '||n
  from generate_series(1,7) n join public.documents d on d.organization_id=target_organization_id and d.document_number='DEMO-DOC-'||lpad(n::text,3,'0');

  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  select target_organization_id, target_owner_id, 'document', d.id, 'Demo activity: document reviewed'
  from public.documents d where d.organization_id=target_organization_id order by d.document_number limit 28;

  perform security.seed_note_it_service_demo(target_organization_id,target_owner_id);

  select jsonb_build_object('organization_id',target_organization_id,'companies',(select count(*) from public.companies where organization_id=target_organization_id),'customers',(select count(*) from public.customers where organization_id=target_organization_id),'documents',(select count(*) from public.documents where organization_id=target_organization_id),'follow_ups',(select count(*) from public.follow_ups where organization_id=target_organization_id),'activity',(select count(*) from public.activity_logs where organization_id=target_organization_id)) into result;
  return result;
end;
$$;



revoke all on function public.reset_note_it_demo_workspace() from public,anon,authenticated;
grant execute on function public.reset_note_it_demo_workspace() to service_role;
