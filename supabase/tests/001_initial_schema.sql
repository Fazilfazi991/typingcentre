begin;
select plan(16);

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'documents', 'documents table exists');
select has_table('public', 'organization_memberships', 'membership table exists');
select has_column('public', 'organizations', 'slug', 'organization slug exists');
select col_type_is('public', 'documents', 'organization_id', 'uuid', 'document organization id is uuid');
select col_not_null('public', 'documents', 'display_name', 'document display name is required');
select has_fk('public', 'documents', 'document tenant type FK exists');
select has_fk('public', 'follow_ups', 'follow-up tenant customer FK exists');
select has_index('public', 'documents', 'documents_organization_expiry_idx', 'expiry index exists');
select has_index('public', 'follow_ups', 'follow_ups_organization_due_idx', 'follow-up due index exists');
select has_function('public', 'set_updated_at', 'updated-at trigger function exists');
select has_function('public', 'customer_activity_timeline', 'customer activity timeline function exists');
select has_index('public', 'activity_logs', 'activity_logs_organization_entity_created_idx', 'customer activity lookup index exists');
select isnt_empty($$ select 1 from public.organizations where slug = 'al-noor-typing-centre' $$, 'seed organization exists');
select results_eq($$ select count(*)::integer from public.organization_subscriptions $$, array[3], 'seed subscriptions exist');
select cmp_ok((select count(*)::integer from public.documents), '>=', 39, 'seed documents exist');

select * from finish();
rollback;
