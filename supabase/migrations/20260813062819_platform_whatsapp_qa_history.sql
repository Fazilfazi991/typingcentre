create table public.platform_whatsapp_qa_sends (
  id uuid primary key default gen_random_uuid(),
  platform_admin_user_id uuid not null references public.profiles(id) on delete cascade,
  template_name text not null check (
    template_name in ('hello_world', 'document_expiry_summary', 'document_expiry_summary_v2')
  ),
  template_language text not null,
  recipient_masked text not null,
  meta_message_id text,
  response_status integer,
  status text not null check (status in ('accepted', 'sent', 'delivered', 'read', 'failed')),
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
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index platform_whatsapp_qa_sends_meta_message_id_idx
  on public.platform_whatsapp_qa_sends (meta_message_id)
  where meta_message_id is not null;
create index platform_whatsapp_qa_sends_created_idx
  on public.platform_whatsapp_qa_sends (created_at desc);

alter table public.platform_whatsapp_qa_sends enable row level security;
revoke all on public.platform_whatsapp_qa_sends from anon, authenticated;
grant select on public.platform_whatsapp_qa_sends to authenticated;
grant all on public.platform_whatsapp_qa_sends to service_role;

create policy platform_whatsapp_qa_sends_select_platform_admin
  on public.platform_whatsapp_qa_sends for select to authenticated
  using ((select security.is_platform_admin()));

create trigger platform_whatsapp_qa_sends_set_updated_at
  before update on public.platform_whatsapp_qa_sends
  for each row execute function public.set_updated_at();

comment on table public.platform_whatsapp_qa_sends is
  'Isolated platform-admin QA ledger for controlled WhatsApp template tests; never contains tenant notification rows or raw recipients.';

create or replace function public.record_platform_whatsapp_qa_delivery_status(
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
  current_record public.platform_whatsapp_qa_sends%rowtype;
  event_at timestamptz := coalesce(p_event_at, timezone('utc', now()));
  current_rank integer;
  incoming_rank integer;
  next_status text;
begin
  if p_status not in ('sent', 'delivered', 'read', 'failed')
    or nullif(trim(p_meta_message_id), '') is null then
    return false;
  end if;

  select * into current_record
  from public.platform_whatsapp_qa_sends
  where meta_message_id = p_meta_message_id
  for update;
  if not found then return false; end if;

  current_rank := case current_record.status
    when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3
    when 'read' then 4 else -1 end;
  incoming_rank := case p_status
    when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else -1 end;
  next_status := current_record.status;

  if p_status = 'failed' and current_record.status not in ('delivered', 'read') then
    next_status := 'failed';
  elsif p_status <> 'failed' and current_record.status <> 'failed' and incoming_rank >= current_rank then
    next_status := p_status;
  end if;

  update public.platform_whatsapp_qa_sends set
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

  return true;
end;
$$;

revoke all on function public.record_platform_whatsapp_qa_delivery_status(text, text, timestamptz, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_platform_whatsapp_qa_delivery_status(text, text, timestamptz, integer, text, text, text)
  to service_role;
