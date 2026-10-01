-- Record request status changes in a tenant-scoped, append-only history.
create table public.service_request_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_request_id uuid not null,
  from_status text,
  to_status text not null,
  change_type text not null check (change_type in ('baseline','created','transition')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,service_request_id)
    references public.service_requests(organization_id,id) on delete cascade,
  check (from_status is distinct from to_status)
);

create index service_request_status_history_request_idx
  on public.service_request_status_history(organization_id,service_request_id,changed_at desc);

alter table public.service_request_status_history enable row level security;
create policy status_history_read on public.service_request_status_history
  for select to authenticated using (security.can_access_organization(organization_id));
revoke all on public.service_request_status_history from public,anon,authenticated;
grant select on public.service_request_status_history to authenticated;

-- The preceding demo migration creates requests before this table exists.
-- Mark their observed state without claiming to reconstruct earlier transitions.
insert into public.service_request_status_history
  (organization_id,service_request_id,to_status,change_type,changed_at)
select organization_id,id,status,'baseline',now() from public.service_requests;

create function security.record_service_request_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.service_request_status_history
      (organization_id,service_request_id,to_status,change_type,changed_by)
    values (new.organization_id,new.id,new.status,'created',(select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.service_request_status_history
      (organization_id,service_request_id,from_status,to_status,change_type,changed_by)
    values (new.organization_id,new.id,old.status,new.status,'transition',(select auth.uid()));
  end if;
  return new;
end $$;

revoke all on function security.record_service_request_status() from public,anon,authenticated;
create trigger service_request_status_history_insert
  after insert on public.service_requests for each row
  execute function security.record_service_request_status();
create trigger service_request_status_history_update
  after update of status on public.service_requests for each row
  execute function security.record_service_request_status();

-- The historical baseline supports WhatsApp delivery, but the new demo
-- project must not run the production dispatcher automatically.
do $$
declare existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'noteit-whatsapp-expiry-dispatch'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end $$;
