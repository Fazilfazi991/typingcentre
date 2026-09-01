create index if not exists documents_organization_customer_expiry_idx
  on public.documents (organization_id, customer_id, expires_on)
  where archived_at is null and customer_id is not null;

create or replace function public.dashboard_snapshot(
  target_organization_id uuid,
  target_today date,
  follow_up_start timestamptz,
  follow_up_end timestamptz,
  activity_limit integer default 5
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with relevant_documents as (
    select d.*
    from public.documents d
    join public.organization_document_types dt on dt.id = d.document_type_id and dt.organization_id = d.organization_id and dt.is_active
    left join public.customers c on c.id = d.customer_id and c.organization_id = d.organization_id
    left join public.companies co on co.id = d.company_id and co.organization_id = d.organization_id
    left join public.branches b on b.id = d.branch_id and b.organization_id = d.organization_id
    where d.organization_id = target_organization_id and d.archived_at is null and d.expires_on is not null
      and (c.id is null or (c.archived_at is null and c.is_active and c.status not in ('removed','suspended')))
      and (co.id is null or (co.archived_at is null and co.is_active and co.status not in ('removed','suspended')))
      and (b.id is null or (b.archived_at is null and b.is_active and b.status not in ('removed','suspended')))
  ), metrics as (
    select jsonb_build_object(
      'total', count(*),
      'valid', count(*) filter (where status <> 'renewal_in_progress' and expires_on > target_today + 30),
      'expiringSoon', count(*) filter (where status <> 'renewal_in_progress' and expires_on between target_today and target_today + 30),
      'expired', count(*) filter (where status <> 'renewal_in_progress' and expires_on < target_today),
      'renewalInProgress', count(*) filter (where status = 'renewal_in_progress'),
      'today', count(*) filter (where expires_on = target_today),
      'week', count(*) filter (where expires_on between target_today and target_today + 7),
      'days0To30', count(*) filter (where expires_on between target_today and target_today + 30),
      'days31To60', count(*) filter (where expires_on between target_today + 31 and target_today + 60),
      'days61To90', count(*) filter (where expires_on between target_today + 61 and target_today + 90)
    ) value from relevant_documents
  ), attention as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.expires_on), '[]'::jsonb) value from (
      select d.id,d.document_number,d.expires_on,d.status,
        case when c.id is null then null else jsonb_build_object('full_name',c.full_name) end customers,
        case when co.id is null then null else jsonb_build_object('name',co.name) end companies,
        jsonb_build_object('name',dt.name) organization_document_types
      from relevant_documents d
      join public.organization_document_types dt on dt.id=d.document_type_id and dt.organization_id=d.organization_id
      left join public.customers c on c.id=d.customer_id and c.organization_id=d.organization_id
      left join public.companies co on co.id=d.company_id and co.organization_id=d.organization_id
      where d.expires_on < target_today + 8 order by d.expires_on limit 8
    ) x
  ), followups as (
    select jsonb_build_object('count', count(*), 'items', coalesce(jsonb_agg(to_jsonb(x) order by x.due_at) filter (where x.ordinal <= 5), '[]'::jsonb)) value
    from (
      select f.id,f.due_at,f.status,f.note,f.customer_id,f.company_id,
        case when c.id is null then null else jsonb_build_object('full_name',c.full_name) end customers,
        case when co.id is null then null else jsonb_build_object('name',co.name) end companies,
        row_number() over (order by f.due_at) ordinal
      from public.follow_ups f
      left join public.customers c on c.id=f.customer_id and c.organization_id=f.organization_id
      left join public.companies co on co.id=f.company_id and co.organization_id=f.organization_id
      where f.organization_id=target_organization_id and f.due_at>=follow_up_start and f.due_at<follow_up_end and f.status<>'completed'
    ) x
  ), activities as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) value from (
      select id,entity_type,message,created_at from public.activity_logs where organization_id=target_organization_id order by created_at desc limit least(greatest(activity_limit,1),20)
    ) x
  )
  select jsonb_build_object('metrics',metrics.value,'attention',attention.value,'followUps',followups.value,'activity',activities.value)
  from metrics,attention,followups,activities;
$$;

create or replace function public.customer_list_summary(
  target_organization_id uuid,
  search_text text default '',
  sort_column text default 'updated_at',
  sort_ascending boolean default false,
  page_offset integer default 0,
  page_limit integer default 20
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select c.* from public.customers c
    where c.organization_id=target_organization_id and c.archived_at is null
      and (length(search_text)<2 or c.full_name ilike '%'||search_text||'%' or c.phone ilike '%'||search_text||'%' or c.passport_number ilike '%'||search_text||'%' or c.emirates_id_number ilike '%'||search_text||'%')
  ), page as (
    select * from filtered
    order by
      case when sort_column='full_name' and sort_ascending then full_name end asc,
      case when sort_column='full_name' and not sort_ascending then full_name end desc,
      case when sort_column<>'full_name' and sort_ascending then updated_at end asc,
      case when sort_column<>'full_name' and not sort_ascending then updated_at end desc
    offset greatest(page_offset,0) limit least(greatest(page_limit,1),100)
  ), rows as (
    select p.id,p.full_name,p.customer_type,p.nationality,p.phone,p.passport_number,p.emirates_id_number,
      case when co.id is null then null else jsonb_build_object('name',co.name) end companies,
      case when b.id is null then null else jsonb_build_object('name',b.name) end branches,
      ds.document_count,ds.next_expiry_date,ds.next_document_type
    from page p
    left join public.companies co on co.id=p.company_id and co.organization_id=p.organization_id
    left join public.branches b on b.id=p.branch_id and b.organization_id=p.organization_id
    left join lateral (
      select count(*) document_count,
        (array_agg(d.expires_on order by d.expires_on) filter (where d.expires_on is not null))[1] next_expiry_date,
        (array_agg(dt.name order by d.expires_on) filter (where d.expires_on is not null))[1] next_document_type
      from public.documents d left join public.organization_document_types dt on dt.id=d.document_type_id and dt.organization_id=d.organization_id
      where d.organization_id=p.organization_id and d.customer_id=p.id and d.archived_at is null
    ) ds on true
  ) select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(rows)) from rows),'[]'::jsonb));
$$;

create or replace function public.owner_search(target_organization_id uuid, owner_kind text, search_text text default '', result_limit integer default 25)
returns table(id uuid,label text,description text)
language sql stable security invoker set search_path=''
as $$
  select x.id,x.label,x.description from (
    select c.id,c.full_name label,concat_ws(' · ',co.name,coalesce(nullif(c.phone,''),c.email)) description,c.full_name sort_name
    from public.customers c left join public.companies co on co.id=c.company_id and co.organization_id=c.organization_id
    where owner_kind='customer' and c.organization_id=target_organization_id and c.archived_at is null
      and (search_text='' or c.full_name ilike '%'||search_text||'%' or c.phone ilike '%'||search_text||'%' or c.email ilike '%'||search_text||'%' or co.name ilike '%'||search_text||'%')
    union all
    select co.id,co.name,concat_ws(' · ',co.licence_number,co.contact_phone),co.name
    from public.companies co where owner_kind='company' and co.organization_id=target_organization_id and co.archived_at is null
      and (search_text='' or co.name ilike '%'||search_text||'%' or co.trade_name ilike '%'||search_text||'%' or co.contact_phone ilike '%'||search_text||'%' or co.contact_email ilike '%'||search_text||'%' or co.licence_number ilike '%'||search_text||'%')
  ) x order by x.sort_name limit least(greatest(result_limit,1),25);
$$;

revoke all on function public.dashboard_snapshot(uuid,date,timestamptz,timestamptz,integer) from public, anon;
revoke all on function public.customer_list_summary(uuid,text,text,boolean,integer,integer) from public, anon;
revoke all on function public.owner_search(uuid,text,text,integer) from public, anon;
grant execute on function public.dashboard_snapshot(uuid,date,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.customer_list_summary(uuid,text,text,boolean,integer,integer) to authenticated;
grant execute on function public.owner_search(uuid,text,text,integer) to authenticated;
