-- Service-only, transaction-scoped reset for the single public Note It demo tenant.
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

  select jsonb_build_object('organization_id',target_organization_id,'companies',(select count(*) from public.companies where organization_id=target_organization_id),'customers',(select count(*) from public.customers where organization_id=target_organization_id),'documents',(select count(*) from public.documents where organization_id=target_organization_id),'follow_ups',(select count(*) from public.follow_ups where organization_id=target_organization_id),'activity',(select count(*) from public.activity_logs where organization_id=target_organization_id)) into result;
  return result;
end;
$$;

revoke all on function public.reset_note_it_demo_workspace() from public, anon, authenticated;
grant execute on function public.reset_note_it_demo_workspace() to service_role;

-- Vercel Hobby rejects sub-daily schedules. Use the existing protected
-- Supabase Cron + Vault path to invoke the server endpoint every six hours.
do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in select jobid from cron.job where jobname = 'noteit-demo-reset'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  if exists (select 1 from vault.decrypted_secrets where name = 'noteit_cron_secret') then
    perform cron.schedule(
      'noteit-demo-reset',
      '0 */6 * * *',
      $job$
        select net.http_get(
          url := 'https://www.noteitapp.com/api/internal/demo-reset',
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'noteit_cron_secret' limit 1)
          ),
          timeout_milliseconds := 30000
        ) as request_id;
      $job$
    );
  else
    raise notice 'Demo reset cron was not scheduled: Vault secret noteit_cron_secret is absent';
  end if;
end;
$$;
