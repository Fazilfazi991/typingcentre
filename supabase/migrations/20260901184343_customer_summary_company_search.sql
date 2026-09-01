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
    select c.*
    from public.customers c
    left join public.companies search_company
      on search_company.id = c.company_id
      and search_company.organization_id = c.organization_id
    where c.organization_id = target_organization_id
      and c.archived_at is null
      and (
        length(search_text) < 2
        or c.full_name ilike '%' || search_text || '%'
        or c.phone ilike '%' || search_text || '%'
        or c.passport_number ilike '%' || search_text || '%'
        or c.emirates_id_number ilike '%' || search_text || '%'
        or search_company.name ilike '%' || search_text || '%'
        or search_company.trade_name ilike '%' || search_text || '%'
      )
  ), page as (
    select * from filtered
    order by
      case when sort_column = 'full_name' and sort_ascending then full_name end asc,
      case when sort_column = 'full_name' and not sort_ascending then full_name end desc,
      case when sort_column <> 'full_name' and sort_ascending then updated_at end asc,
      case when sort_column <> 'full_name' and not sort_ascending then updated_at end desc
    offset greatest(page_offset, 0)
    limit least(greatest(page_limit, 1), 100)
  ), rows as (
    select p.id, p.full_name, p.customer_type, p.nationality, p.phone,
      p.passport_number, p.emirates_id_number,
      case when co.id is null then null else jsonb_build_object('name', co.name) end companies,
      case when b.id is null then null else jsonb_build_object('name', b.name) end branches,
      ds.document_count, ds.next_expiry_date, ds.next_document_type
    from page p
    left join public.companies co on co.id = p.company_id and co.organization_id = p.organization_id
    left join public.branches b on b.id = p.branch_id and b.organization_id = p.organization_id
    left join lateral (
      select count(*) document_count,
        (array_agg(d.expires_on order by d.expires_on) filter (where d.expires_on is not null))[1] next_expiry_date,
        (array_agg(dt.name order by d.expires_on) filter (where d.expires_on is not null))[1] next_document_type
      from public.documents d
      left join public.organization_document_types dt
        on dt.id = d.document_type_id and dt.organization_id = d.organization_id
      where d.organization_id = p.organization_id
        and d.customer_id = p.id
        and d.archived_at is null
    ) ds on true
  )
  select jsonb_build_object(
    'count', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb)
  );
$$;

revoke all on function public.customer_list_summary(uuid,text,text,boolean,integer,integer) from public, anon;
grant execute on function public.customer_list_summary(uuid,text,text,boolean,integer,integer) to authenticated;
