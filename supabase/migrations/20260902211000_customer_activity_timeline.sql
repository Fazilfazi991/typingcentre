-- Keep customer history derived from canonical tenant-owned records.
create index if not exists activity_logs_organization_entity_created_idx
  on public.activity_logs (organization_id, entity_type, entity_id, created_at desc);

create or replace function public.customer_activity_timeline(
  target_organization_id uuid,
  target_customer_id uuid,
  result_limit integer default 10
) returns table (
  id uuid,
  entity_type text,
  message text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select activity.id, activity.entity_type, activity.message, activity.created_at
  from public.activity_logs activity
  where activity.organization_id = target_organization_id
    and (
      (activity.entity_type = 'customer' and activity.entity_id = target_customer_id)
      or (
        activity.entity_type = 'document'
        and exists (
          select 1
          from public.documents document
          where document.id = activity.entity_id
            and document.organization_id = target_organization_id
            and document.customer_id = target_customer_id
        )
      )
      or (
        activity.entity_type = 'follow_up'
        and exists (
          select 1
          from public.follow_ups follow_up
          where follow_up.id = activity.entity_id
            and follow_up.organization_id = target_organization_id
            and follow_up.customer_id = target_customer_id
        )
      )
    )
  order by activity.created_at desc
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.customer_activity_timeline(uuid, uuid, integer) from public, anon;
grant execute on function public.customer_activity_timeline(uuid, uuid, integer) to authenticated;
