-- Live owner operations without changing the seeded demo. All writes roll back.
begin;
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where email='demo.owner@example.invalid'),true);
set local role authenticated;
create temporary table qa_created(kind text primary key,id uuid not null) on commit drop;

with created as (
  insert into public.companies(organization_id,name,city,licence_number)
  select id,'QA Fictional Company','Dubai','QA-LIC-ROLLBACK'
  from public.organizations where slug='note-it-demo' returning id
)
insert into qa_created select 'company',id from created;

with created as (
  insert into public.branches(organization_id,company_id,name,city)
  select o.id,(select id from qa_created where kind='company'),
    'QA Fictional Branch','Dubai'
  from public.organizations o where o.slug='note-it-demo' returning id
)
insert into qa_created select 'branch',id from created;

with created as (
  insert into public.customers(organization_id,company_id,branch_id,full_name,phone)
  select o.id,(select id from qa_created where kind='company'),
    (select id from qa_created where kind='branch'),
    'QA Fictional Customer','+971 50 000 2001'
  from public.organizations o where o.slug='note-it-demo' returning id
)
insert into qa_created select 'customer',id from created;

with created as (
  insert into public.documents(organization_id,document_type_id,customer_id,
    display_name,document_number,expires_on)
  select o.id,t.id,(select id from qa_created where kind='customer'),
    'QA Passport','QA-DOC-ROLLBACK',current_date+365
  from public.organizations o
  join public.organization_document_types t
    on t.organization_id=o.id and t.name='Passport'
  where o.slug='note-it-demo' returning id
)
insert into qa_created select 'document',id from created;

with created as (
  insert into public.renewals(organization_id,document_id,status,started_at)
  select o.id,(select id from qa_created where kind='document'),
    'in_progress',now()
  from public.organizations o where o.slug='note-it-demo' returning id
)
insert into qa_created select 'renewal',id from created;

with created as (
  insert into public.follow_ups(organization_id,customer_id,document_id,due_at,note)
  select o.id,(select id from qa_created where kind='customer'),
    (select id from qa_created where kind='document'),now()+interval '1 day',
    'QA fictional follow-up'
  from public.organizations o where o.slug='note-it-demo' returning id
)
insert into qa_created select 'follow_up',id from created;

update public.companies set name='QA Fictional Company Updated'
  where id=(select id from qa_created where kind='company');
update public.branches set name='QA Fictional Branch Updated'
  where id=(select id from qa_created where kind='branch');
update public.customers set phone='+971 50 000 2002'
  where id=(select id from qa_created where kind='customer');
update public.follow_ups set note='QA fictional follow-up updated'
  where id=(select id from qa_created where kind='follow_up');

do $$
begin
  if (select count(*) from qa_created)<>6
    or not exists(select 1 from public.companies
      where id=(select id from qa_created where kind='company')
        and name='QA Fictional Company Updated')
    or not exists(select 1 from public.branches
      where id=(select id from qa_created where kind='branch')
        and name='QA Fictional Branch Updated')
    or not exists(select 1 from public.customers
      where id=(select id from qa_created where kind='customer')
        and phone='+971 50 000 2002')
    or not exists(select 1 from public.documents
      where id=(select id from qa_created where kind='document')
        and display_name='QA Passport')
    or not exists(select 1 from public.renewals
      where id=(select id from qa_created where kind='renewal')
        and status='in_progress')
    or not exists(select 1 from public.follow_ups
      where id=(select id from qa_created where kind='follow_up')
        and note='QA fictional follow-up updated')
  then raise exception 'Owner workspace CRUD verification failed'; end if;
end $$;

rollback;
