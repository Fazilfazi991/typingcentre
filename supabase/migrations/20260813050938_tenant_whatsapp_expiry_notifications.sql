-- Tenant WhatsApp expiry settings remain disabled for every existing organization.
alter table public.organizations
  add column whatsapp_notifications_enabled boolean not null default false,
  add column whatsapp_recipient_phone text,
  add column whatsapp_notification_time time not null default '09:00',
  add column whatsapp_last_sent_at timestamptz,
  add column whatsapp_last_status text,
  add column whatsapp_last_message_id text,
  add constraint organizations_whatsapp_recipient_e164_check
    check (whatsapp_recipient_phone is null or whatsapp_recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint organizations_whatsapp_last_status_check
    check (whatsapp_last_status is null or whatsapp_last_status in ('processing', 'accepted', 'sent', 'delivered', 'read', 'failed'));

grant update (
  whatsapp_notifications_enabled,
  whatsapp_recipient_phone,
  whatsapp_notification_time
) on public.organizations to authenticated;

create table public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notification_type text not null check (notification_type = 'document_expiry_summary'),
  summary_local_date date not null,
  recipient_phone text not null check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  template_name text not null check (template_name = 'document_expiry_summary'),
  template_language text not null check (template_language = 'en'),
  expiring_today_count integer not null check (expiring_today_count >= 0),
  next_7_days_count integer not null check (next_7_days_count >= 0),
  next_30_days_count integer not null check (next_30_days_count >= 0),
  total_count integer not null check (
    total_count = expiring_today_count + next_7_days_count + next_30_days_count
    and total_count > 0
  ),
  meta_message_id text,
  status text not null check (status in ('processing', 'accepted', 'sent', 'delivered', 'read', 'failed')),
  meta_error_code integer,
  meta_error_title text,
  meta_error_message text,
  meta_error_details text,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, notification_type, summary_local_date)
);

create index whatsapp_notifications_organization_created_idx
  on public.whatsapp_notifications (organization_id, created_at desc);
create unique index whatsapp_notifications_meta_message_id_idx
  on public.whatsapp_notifications (meta_message_id)
  where meta_message_id is not null;

alter table public.whatsapp_notifications enable row level security;
revoke all on public.whatsapp_notifications from anon, authenticated;
grant select on public.whatsapp_notifications to authenticated;
grant all on public.whatsapp_notifications to service_role;

create policy whatsapp_notifications_select_member_or_platform_admin
  on public.whatsapp_notifications for select to authenticated
  using (
    (select security.can_access_organization(organization_id))
    or (select security.is_platform_admin())
  );

create trigger whatsapp_notifications_set_updated_at
  before update on public.whatsapp_notifications
  for each row execute function public.set_updated_at();

comment on table public.whatsapp_notifications is
  'Tenant-scoped, RLS-protected delivery and idempotency ledger for WhatsApp expiry summaries.';

-- Webhook-only status transition. Browser roles cannot execute this function.
create or replace function public.record_whatsapp_delivery_status(
  p_meta_message_id text,
  p_status text,
  p_event_at timestamptz default null,
  p_error_code integer default null,
  p_error_title text default null,
  p_error_message text default null,
  p_error_details text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.whatsapp_notifications%rowtype;
  event_at timestamptz := coalesce(p_event_at, timezone('utc', now()));
  current_rank integer;
  incoming_rank integer;
  next_status text;
begin
  if p_status not in ('sent', 'delivered', 'read', 'failed') or nullif(trim(p_meta_message_id), '') is null then
    return false;
  end if;

  select * into current_record
  from public.whatsapp_notifications
  where meta_message_id = p_meta_message_id
  for update;
  if not found then return false; end if;

  current_rank := case current_record.status
    when 'processing' then 0 when 'accepted' then 1 when 'sent' then 2
    when 'delivered' then 3 when 'read' then 4 else -1 end;
  incoming_rank := case p_status when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else -1 end;
  next_status := current_record.status;

  if p_status = 'failed' and current_record.status not in ('delivered', 'read') then
    next_status := 'failed';
  elsif p_status <> 'failed' and current_record.status <> 'failed' and incoming_rank >= current_rank then
    next_status := p_status;
  end if;

  update public.whatsapp_notifications set
    status = next_status,
    sent_at = case when p_status = 'sent' then coalesce(sent_at, event_at) else sent_at end,
    delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, event_at) else delivered_at end,
    read_at = case when p_status = 'read' then coalesce(read_at, event_at) else read_at end,
    failed_at = case when p_status = 'failed' and next_status = 'failed' then coalesce(failed_at, event_at) else failed_at end,
    meta_error_code = case when p_status = 'failed' and next_status = 'failed' then p_error_code else meta_error_code end,
    meta_error_title = case when p_status = 'failed' and next_status = 'failed' then left(p_error_title, 500) else meta_error_title end,
    meta_error_message = case when p_status = 'failed' and next_status = 'failed' then left(p_error_message, 500) else meta_error_message end,
    meta_error_details = case when p_status = 'failed' and next_status = 'failed' then left(p_error_details, 500) else meta_error_details end
  where id = current_record.id;

  update public.organizations
  set whatsapp_last_status = next_status
  where id = current_record.organization_id
    and whatsapp_last_message_id = p_meta_message_id;

  return true;
end;
$$;

revoke all on function public.record_whatsapp_delivery_status(text, text, timestamptz, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.record_whatsapp_delivery_status(text, text, timestamptz, integer, text, text, text) to service_role;
