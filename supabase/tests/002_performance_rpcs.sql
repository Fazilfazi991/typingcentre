begin;
select plan(21);
set local session_replication_role = replica;

insert into public.organizations (id,name,slug,location) values
  ('a0000000-0000-0000-0000-000000000001','Performance A','performance-a','Dubai'),
  ('b0000000-0000-0000-0000-000000000001','Performance B','performance-b','Dubai');
insert into public.organization_document_types (id,organization_id,name) values
  ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Passport'),
  ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Passport');
insert into public.companies (id,organization_id,name,contact_phone) values
  ('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Acme Typing','+971500000001'),
  ('b2000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Other Company','+971500000002');
insert into public.customers (id,organization_id,company_id,full_name,phone,archived_at) values
  ('a3000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','Alice Example','+971501111111',null),
  ('a3000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',null,'Archived Alice','+971501111112',now()),
  ('b3000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Bob Other','+971502222222',null);

insert into public.documents (organization_id,document_type_id,customer_id,display_name,document_number,issued_on,expires_on,status,archived_at)
select 'a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','Passport','A-'||i,date '2025-01-01',date '2026-09-01'+(i-3),case when i=1 then 'expired'::public.document_status else 'valid'::public.document_status end,case when i=10 then now() else null end
from generate_series(1,10)i;
insert into public.documents (organization_id,document_type_id,customer_id,display_name,document_number,issued_on,expires_on,status)
values ('b0000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001','Passport','B-1','2025-01-01','2026-09-01','valid');
insert into public.follow_ups (organization_id,customer_id,due_at,status,note)
select 'a0000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','2026-09-01 04:00:00+00'::timestamptz+(i||' minutes')::interval,'pending','Follow-up '||i from generate_series(1,7)i;
insert into public.activity_logs (organization_id,entity_type,message)
select 'a0000000-0000-0000-0000-000000000001','document','Activity '||i from generate_series(1,25)i;

select has_function('public','dashboard_snapshot',array['uuid','date','timestamp with time zone','timestamp with time zone','integer'],'dashboard snapshot exists');
select has_function('public','customer_list_summary',array['uuid','text','text','boolean','integer','integer'],'customer summary exists');
select has_function('public','owner_search',array['uuid','text','text','integer'],'owner search exists');
select has_index('public','documents','documents_organization_customer_expiry_idx','customer expiry index exists');
select ok(not has_function_privilege('anon','public.dashboard_snapshot(uuid,date,timestamptz,timestamptz,integer)','EXECUTE'),'anon cannot execute dashboard snapshot');
select ok(has_function_privilege('authenticated','public.dashboard_snapshot(uuid,date,timestamptz,timestamptz,integer)','EXECUTE'),'authenticated can execute dashboard snapshot');

create temporary table snapshot as select public.dashboard_snapshot('a0000000-0000-0000-0000-000000000001','2026-09-01','2026-09-01 00:00+00','2026-09-02 00:00+00',20) payload;
select is((payload->'metrics'->>'total')::integer,9,'dashboard excludes archived documents') from snapshot;
select is(jsonb_array_length(payload->'attention'),8,'attention is bounded to eight') from snapshot;
select is((payload->'followUps'->>'count')::integer,7,'follow-up aggregate is correct') from snapshot;
select is(jsonb_array_length(payload->'followUps'->'items'),5,'follow-up detail is bounded to five') from snapshot;
select is(jsonb_array_length(payload->'activity'),20,'activity detail is bounded to twenty') from snapshot;
select ok((payload::text not like '%Bob Other%') and (payload::text not like '%B-1%'),'dashboard excludes another organization') from snapshot;

create temporary table customer_summary as select public.customer_list_summary('a0000000-0000-0000-0000-000000000001','Alice','full_name',true,0,20) payload;
select is((payload->>'count')::integer,1,'archived customer is excluded') from customer_summary;
select is((payload->'rows'->0->>'document_count')::integer,9,'active document count is correct') from customer_summary;
select is(payload->'rows'->0->>'next_expiry_date','2026-08-30','next expiry is correct') from customer_summary;
select ok(payload::text not like '%Bob Other%','customer summary excludes another organization') from customer_summary;

create temporary table company_customer_summary as select public.customer_list_summary('a0000000-0000-0000-0000-000000000001','Acme','full_name',true,0,20) payload;
select is((payload->>'count')::integer,1,'customer summary finds a customer by company name') from company_customer_summary;

select results_eq($$select label from public.owner_search('a0000000-0000-0000-0000-000000000001','customer','Alice',25)$$,$$values ('Alice Example'::text)$$,'owner search finds customer name');
select results_eq($$select label from public.owner_search('a0000000-0000-0000-0000-000000000001','customer','Acme',25)$$,$$values ('Alice Example'::text)$$,'owner search folds company name matching into customer results');
select is((select count(*)::integer from public.owner_search('a0000000-0000-0000-0000-000000000001','customer','',1)),1,'owner results honor the requested bound');
select is((select count(*)::integer from public.owner_search('a0000000-0000-0000-0000-000000000001','customer','Bob',25)),0,'owner search excludes another organization');

select * from finish();
rollback;
