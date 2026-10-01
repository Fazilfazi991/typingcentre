-- Transactional live-project check. Run only against the linked demo project.
-- A successful run rolls back both fictional test tenants and all their data.
begin;

insert into auth.users(id,email,raw_user_meta_data) values
  ('c1000000-0000-4000-8000-000000000001','isolation-a@example.invalid','{"full_name":"Isolation A"}'),
  ('c1000000-0000-4000-8000-000000000002','isolation-b@example.invalid','{"full_name":"Isolation B"}');

set local role authenticated;
create temporary table qa_workspace(name text primary key, id uuid not null) on commit drop;
create temporary table qa_customer(name text primary key, id uuid not null) on commit drop;

select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
insert into qa_workspace values ('a',public.provision_current_user_workspace('Isolation A','Dubai','Isolation A',null));
with created as (
  insert into public.customers(organization_id,full_name,phone) values
    ((select id from qa_workspace where name='a'),'Customer A','+971 50 000 1001') returning id
)
insert into qa_customer select 'a',id from created;
insert into public.service_catalog(id,organization_id,code,name,category,service_fee) values
  ('c1000000-0000-4000-8000-000000000020',(select id from qa_workspace where name='a'),'QA-A','Service A','Other',100);
insert into public.service_catalog_requirements(organization_id,service_id,name,document_type_id,required)
select w.id,'c1000000-0000-4000-8000-000000000020','Passport',t.id,true
from qa_workspace w join public.organization_document_types t
  on t.organization_id=w.id and t.name='Passport' where w.name='a';
insert into public.documents(id,organization_id,document_type_id,customer_id,display_name,document_number,expires_on)
select 'c1000000-0000-4000-8000-000000000040',w.id,t.id,
  (select id from qa_customer where name='a'),'Passport A','QA-PASS-A',current_date+365
from qa_workspace w join public.organization_document_types t
  on t.organization_id=w.id and t.name='Passport' where w.name='a';
insert into public.service_requests(id,organization_id,customer_id,service_id) values
  ('c1000000-0000-4000-8000-000000000030',(select id from qa_workspace where name='a'),
   (select id from qa_customer where name='a'),'c1000000-0000-4000-8000-000000000020');
do $$
begin
  if (select count(*) from public.service_request_requirements
      where service_request_id='c1000000-0000-4000-8000-000000000030')<>1
  then raise exception 'Catalog checklist was not copied'; end if;
  begin
    update public.service_requests set status='ready_to_submit'
      where id='c1000000-0000-4000-8000-000000000030';
    raise exception 'Missing document did not block submission';
  exception when others then
    if sqlerrm='Missing document did not block submission' then raise; end if;
  end;
end $$;
update public.service_requests set status='waiting_documents'
  where id='c1000000-0000-4000-8000-000000000030';
update public.service_request_requirements
  set document_id='c1000000-0000-4000-8000-000000000040',status='received'
  where service_request_id='c1000000-0000-4000-8000-000000000030';
update public.service_requests set status='ready_to_submit'
  where id='c1000000-0000-4000-8000-000000000030';
update public.service_requests set status='submitted'
  where id='c1000000-0000-4000-8000-000000000030';
update public.service_requests set status='processing'
  where id='c1000000-0000-4000-8000-000000000030';
update public.service_requests set status='ready_for_collection'
  where id='c1000000-0000-4000-8000-000000000030';
update public.service_requests set status='completed'
  where id='c1000000-0000-4000-8000-000000000030';
insert into public.service_payments(organization_id,service_request_id,amount,method) values
  ((select id from qa_workspace where name='a'),'c1000000-0000-4000-8000-000000000030',10,'cash');
do $$
begin
  if not exists(select 1 from public.service_requests
    where id='c1000000-0000-4000-8000-000000000030'
      and status='completed' and paid_amount=10 and payment_status='part_paid')
  then raise exception 'Request or payment state is incorrect'; end if;
  if (select count(*) from public.service_request_status_history
      where service_request_id='c1000000-0000-4000-8000-000000000030')<>7
  then raise exception 'Status history is incomplete'; end if;
  if not exists(select 1 from public.activity_logs
      where entity_id='c1000000-0000-4000-8000-000000000030'
        and entity_type='service_request')
  then raise exception 'Request activity was not logged'; end if;
end $$;

select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
insert into qa_workspace values ('b',public.provision_current_user_workspace('Isolation B','Dubai','Isolation B',null));
with created as (
  insert into public.customers(organization_id,full_name,phone) values
    ((select id from qa_workspace where name='b'),'Customer B','+971 50 000 1002') returning id
)
insert into qa_customer select 'b',id from created;
insert into public.service_catalog(id,organization_id,code,name,category) values
  ('c1000000-0000-4000-8000-000000000021',(select id from qa_workspace where name='b'),'QA-B','Service B','Other');
insert into public.service_catalog_requirements(organization_id,service_id,name,document_type_id,required)
select w.id,'c1000000-0000-4000-8000-000000000021','Passport',t.id,true
from qa_workspace w join public.organization_document_types t
  on t.organization_id=w.id and t.name='Passport' where w.name='b';
insert into public.service_requests(id,organization_id,customer_id,service_id) values
  ('c1000000-0000-4000-8000-000000000031',(select id from qa_workspace where name='b'),
   (select id from qa_customer where name='b'),'c1000000-0000-4000-8000-000000000021');

do $$
declare affected integer;
begin
  if exists(select 1 from public.service_requests where id='c1000000-0000-4000-8000-000000000030')
    or exists(select 1 from public.service_payments where service_request_id='c1000000-0000-4000-8000-000000000030')
    or exists(select 1 from public.service_request_status_history where service_request_id='c1000000-0000-4000-8000-000000000030')
    or exists(select 1 from public.documents where id='c1000000-0000-4000-8000-000000000040')
    or exists(select 1 from public.customers where id=(select id from qa_customer where name='a'))
  then raise exception 'Tenant B can read tenant A data'; end if;

  begin
    insert into public.service_requests(organization_id,customer_id,service_id) values
      ((select id from qa_workspace where name='b'),(select id from qa_customer where name='a'),
       'c1000000-0000-4000-8000-000000000021');
    raise exception 'Cross-tenant customer was accepted';
  exception when others then
    if sqlerrm='Cross-tenant customer was accepted' then raise; end if;
  end;

  begin
    update public.service_request_requirements
      set document_id='c1000000-0000-4000-8000-000000000040',status='received'
      where service_request_id='c1000000-0000-4000-8000-000000000031';
    raise exception 'Cross-tenant document was accepted';
  exception when others then
    if sqlerrm='Cross-tenant document was accepted' then raise; end if;
  end;

  begin
    update public.service_requests set assigned_to='c1000000-0000-4000-8000-000000000001'
      where id='c1000000-0000-4000-8000-000000000031';
    raise exception 'Cross-tenant assignee was accepted';
  exception when others then
    if sqlerrm='Cross-tenant assignee was accepted' then raise; end if;
  end;

  begin
    insert into public.service_payments(organization_id,service_request_id,amount,method) values
      ((select id from qa_workspace where name='b'),'c1000000-0000-4000-8000-000000000030',10,'cash');
    raise exception 'Cross-tenant payment was accepted';
  exception when others then
    if sqlerrm='Cross-tenant payment was accepted' then raise; end if;
  end;

  update public.service_requests set notes='unauthorized'
    where id='c1000000-0000-4000-8000-000000000030';
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'Tenant B modified tenant A request'; end if;
end $$;

rollback;
