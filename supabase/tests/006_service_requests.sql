begin;
select plan(22);

insert into auth.users(id,email,raw_user_meta_data) values
  ('c0000000-0000-4000-8000-000000000001','service-owner-one@example.invalid','{"full_name":"Service Owner One"}'),
  ('c0000000-0000-4000-8000-000000000002','service-owner-two@example.invalid','{"full_name":"Service Owner Two"}');

select has_table('public','service_catalog','service catalog exists');
select has_table('public','service_catalog_requirements','catalog checklist exists');
select has_table('public','service_requests','request table exists');
select has_table('public','service_request_requirements','request checklist exists');
select has_table('public','service_request_status_history','status history exists');
select has_table('public','service_payments','payment table exists');
select is((select relrowsecurity from pg_class where oid='public.service_requests'::regclass),true,'requests use RLS');
select is((select relrowsecurity from pg_class where oid='public.service_request_status_history'::regclass),true,'status history uses RLS');

set local role authenticated;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',true);
create temporary table service_workspace_one as select public.provision_current_user_workspace('Service Test One','Dubai','Service Owner One',null) id;
insert into public.customers(id,organization_id,full_name,phone) values
  ('c0000000-0000-4000-8000-000000000010',(select id from service_workspace_one),'Fictional Customer One','+971 50 000 0001');
insert into public.service_catalog(id,organization_id,code,name,category,government_fee,service_fee)
values ('c0000000-0000-4000-8000-000000000020',(select id from service_workspace_one),'VISA-TEST','Visa Test','Residency & Visa',100,50);
insert into public.service_catalog_requirements(organization_id,service_id,name,document_type_id,required)
select (select id from service_workspace_one),'c0000000-0000-4000-8000-000000000020','Passport',id,true
from public.organization_document_types where organization_id=(select id from service_workspace_one) and name='Passport';
insert into public.service_requests(id,organization_id,customer_id,service_id)
values ('c0000000-0000-4000-8000-000000000030',(select id from service_workspace_one),'c0000000-0000-4000-8000-000000000010','c0000000-0000-4000-8000-000000000020');

select matches((select request_number from public.service_requests where id='c0000000-0000-4000-8000-000000000030'),'^SR-[0-9]{6}$','request number is generated');
select is((select count(*)::integer from public.service_request_requirements where service_request_id='c0000000-0000-4000-8000-000000000030'),1,'catalog requirement is copied');
select throws_ok($$update public.service_requests set status='submitted' where id='c0000000-0000-4000-8000-000000000030'$$,'P0001','Invalid service request status transition','cannot skip required stages');
update public.service_requests set status='waiting_documents' where id='c0000000-0000-4000-8000-000000000030';
select throws_ok($$update public.service_requests set status='ready_to_submit' where id='c0000000-0000-4000-8000-000000000030'$$,'P0001','Required documents are still missing','missing document blocks submission');

insert into public.documents(id,organization_id,document_type_id,customer_id,display_name,document_number,expires_on)
select 'c0000000-0000-4000-8000-000000000040',(select id from service_workspace_one),id,'c0000000-0000-4000-8000-000000000010','Passport','SERVICE-TEST-PASS-1',current_date+365
from public.organization_document_types where organization_id=(select id from service_workspace_one) and name='Passport';
update public.service_request_requirements set document_id='c0000000-0000-4000-8000-000000000040',status='received'
where service_request_id='c0000000-0000-4000-8000-000000000030';
select is((select status from public.service_request_requirements where service_request_id='c0000000-0000-4000-8000-000000000030'),'received','existing document is attached');
update public.service_requests set status='ready_to_submit' where id='c0000000-0000-4000-8000-000000000030';
update public.service_requests set status='submitted' where id='c0000000-0000-4000-8000-000000000030';
select is((select status from public.service_requests where id='c0000000-0000-4000-8000-000000000030'),'submitted','request follows validated stages');
select is((select count(*)::integer from public.service_request_status_history where service_request_id='c0000000-0000-4000-8000-000000000030'),4,'creation and three valid transitions are recorded');
insert into public.service_payments(organization_id,service_request_id,amount,method)
values ((select id from service_workspace_one),'c0000000-0000-4000-8000-000000000030',40,'cash');
select is((select paid_amount from public.service_requests where id='c0000000-0000-4000-8000-000000000030'),40.00::numeric,'payment updates paid amount');
select is((select payment_status from public.service_requests where id='c0000000-0000-4000-8000-000000000030'),'part_paid','payment status is derived');

select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000002',true);
create temporary table service_workspace_two as select public.provision_current_user_workspace('Service Test Two','Dubai','Service Owner Two',null) id;
insert into public.service_catalog(id,organization_id,code,name,category) values
  ('c0000000-0000-4000-8000-000000000021',(select id from service_workspace_two),'OTHER-TEST','Other Test','Other');
select throws_ok($$insert into public.service_requests(organization_id,customer_id,service_id)
  values ((select id from service_workspace_two),'c0000000-0000-4000-8000-000000000010','c0000000-0000-4000-8000-000000000021')$$,
  'P0001','Customer is unavailable','cross-tenant customer reference is rejected');
select is((select count(*)::integer from public.service_requests where id='c0000000-0000-4000-8000-000000000030'),0,'another tenant cannot read request');
select is((select count(*)::integer from public.service_payments where service_request_id='c0000000-0000-4000-8000-000000000030'),0,'another tenant cannot read payments');
select is((select count(*)::integer from public.service_request_status_history where service_request_id='c0000000-0000-4000-8000-000000000030'),0,'another tenant cannot read status history');
select ok(not exists(select 1 from public.service_request_requirements where service_request_id='c0000000-0000-4000-8000-000000000030'),'another tenant cannot read checklist');

select * from finish();
rollback;
