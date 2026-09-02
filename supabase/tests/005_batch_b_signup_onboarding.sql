begin;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('b0000000-0000-4000-8000-000000000001', 'batch-b-owner@example.com', '{"full_name":"Initial Owner"}'),
  ('b0000000-0000-4000-8000-000000000002', 'batch-b-other@example.com', '{"full_name":"Other Owner"}');

select has_function(
  'public',
  'provision_current_user_workspace',
  array['text', 'text', 'text', 'text'],
  'atomic workspace provisioning function exists'
);
select has_trigger('auth', 'users', 'on_auth_user_created', 'new Auth users receive a profile');
select is((select count(*)::integer from public.profiles where id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')), 2, 'the Auth trigger creates both profiles');
select is(
  (select p.prosecdef from pg_proc p where p.oid = 'public.provision_current_user_workspace(text,text,text,text)'::regprocedure),
  true,
  'workspace provisioning is security definer'
);
select ok(not has_function_privilege('public', 'public.provision_current_user_workspace(text,text,text,text)', 'execute'), 'PUBLIC cannot provision');
select ok(not has_function_privilege('anon', 'public.provision_current_user_workspace(text,text,text,text)', 'execute'), 'anon cannot provision');
select ok(has_function_privilege('authenticated', 'public.provision_current_user_workspace(text,text,text,text)', 'execute'), 'authenticated users can provision');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
create temporary table first_workspace as
select public.provision_current_user_workspace('Batch B Typing Centre', 'Dubai', 'Batch B Owner', '+971501234567') id;

select is((select count(*)::integer from public.organizations where id = (select id from first_workspace)), 1, 'one workspace is created');
select is((select onboarding_step from public.organizations where id = (select id from first_workspace)), 2::smallint, 'workspace resumes at business details');
select is((select onboarding_completed_at from public.organizations where id = (select id from first_workspace)), null::timestamptz, 'workspace is not prematurely completed');
select matches((select slug from public.organizations where id = (select id from first_workspace)), '^batch-b-typing-centre-b0000000$', 'slug is server-generated and stable');
select is((select role::text from public.organization_memberships where organization_id = (select id from first_workspace)), 'owner', 'caller becomes owner');
select is((select plan::text || ':' || status::text from public.organization_subscriptions where organization_id = (select id from first_workspace)), 'starter:trial', 'starter trial is server-controlled');
select is((select count(*)::integer from public.organization_usage_counters where organization_id = (select id from first_workspace)), 1, 'usage counter is initialized');
select is((select count(*)::integer from public.organization_document_types where organization_id = (select id from first_workspace)), 7, 'canonical document defaults are initialized');
select is((select full_name from public.profiles where id = 'b0000000-0000-4000-8000-000000000001'), 'Batch B Owner', 'owner display name is saved');

create temporary table repeated_workspace as
select public.provision_current_user_workspace('Ignored Duplicate', 'Sharjah', 'Changed Owner', null) id;
select is((select id from repeated_workspace), (select id from first_workspace), 'retry returns the original workspace');
select is((select count(*)::integer from public.organization_memberships where user_id = 'b0000000-0000-4000-8000-000000000001'), 1, 'retry creates no duplicate membership');

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
create temporary table second_workspace as
select public.provision_current_user_workspace('Other Tenant', 'Abu Dhabi', 'Other Owner', null) id;
select is((select count(*)::integer from public.organizations where id = (select id from first_workspace)), 0, 'RLS hides the first tenant from the second owner');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'platform_role', 'update'), 'signup users cannot grant platform roles');

select * from finish();
rollback;
