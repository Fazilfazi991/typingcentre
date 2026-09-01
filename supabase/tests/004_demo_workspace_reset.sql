begin;
select plan(14);
set local session_replication_role = replica;

insert into public.organizations (id,name,slug,location,onboarding_completed_at,onboarding_step)
values ('d0000000-0000-4000-8000-000000000001','Note It Demo','note-it-demo','Dubai',now(),4);
insert into public.organization_memberships (organization_id,user_id,role,status,is_primary_owner)
values ('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','owner','active',true);

select has_function('public','reset_note_it_demo_workspace',array[]::text[],'demo reset function exists');
select is((select p.prosecdef from pg_proc p where p.oid='public.reset_note_it_demo_workspace()'::regprocedure),true,'demo reset is security definer');
select ok(not has_function_privilege('public','public.reset_note_it_demo_workspace()','execute'),'PUBLIC cannot reset Demo');
select ok(not has_function_privilege('anon','public.reset_note_it_demo_workspace()','execute'),'anon cannot reset Demo');
select ok(not has_function_privilege('authenticated','public.reset_note_it_demo_workspace()','execute'),'authenticated cannot reset Demo');
select ok(has_function_privilege('service_role','public.reset_note_it_demo_workspace()','execute'),'service role can reset Demo');

create temporary table reset_one as select public.reset_note_it_demo_workspace() payload;
select is((payload->>'companies')::integer,8,'first reset seeds eight companies') from reset_one;
select is((payload->>'customers')::integer,17,'first reset seeds seventeen customers') from reset_one;
select is((payload->>'documents')::integer,46,'first reset seeds forty-six documents') from reset_one;
select is((payload->>'follow_ups')::integer,7,'first reset seeds seven follow-ups') from reset_one;
select is((payload->>'activity')::integer,28,'first reset seeds twenty-eight activity records') from reset_one;

create temporary table reset_two as select public.reset_note_it_demo_workspace() payload;
select is((select payload from reset_two),(select payload from reset_one),'second reset returns the identical baseline');
select is((select count(*)::integer from public.documents where organization_id='d0000000-0000-4000-8000-000000000001'),46,'second reset creates no document duplicates');
select is((select count(*)::integer from public.organization_memberships where organization_id='d0000000-0000-4000-8000-000000000001'),1,'reset preserves the sole owner membership');

select * from finish();
rollback;
