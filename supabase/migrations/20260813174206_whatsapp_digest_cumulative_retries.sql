-- Renewal digest counts now match the cumulative dashboard windows:
-- today is included in 7 days, and 7 days is included in 30 days.
alter table public.whatsapp_notifications
  drop constraint if exists whatsapp_notifications_check,
  drop constraint if exists whatsapp_notifications_total_count_check,
  drop constraint if exists whatsapp_notifications_template_name_check,
  add column if not exists retry_count integer not null default 0 check (retry_count between 0 and 2),
  add column if not exists retryable boolean not null default false,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

update public.whatsapp_notifications
set next_7_days_count = expiring_today_count + next_7_days_count,
    next_30_days_count = total_count
where total_count = expiring_today_count + next_7_days_count + next_30_days_count;

alter table public.whatsapp_notifications
  add constraint whatsapp_notifications_cumulative_counts_check check (
    expiring_today_count <= next_7_days_count
    and next_7_days_count <= next_30_days_count
    and total_count = next_30_days_count
    and total_count > 0
  ),
  add constraint whatsapp_notifications_template_name_check
    check (template_name ~ '^[A-Za-z0-9_]+$');

create index if not exists whatsapp_notifications_retry_due_idx
  on public.whatsapp_notifications (next_retry_at)
  where status = 'failed' and retryable and next_retry_at is not null;

-- Service-only atomic initial/retry claim. A daily row can be retried only
-- after a retryable provider failure and never after Meta has accepted it.
create or replace function public.claim_whatsapp_expiry_notification(
  p_organization_id uuid,
  p_summary_local_date date,
  p_recipient_phone text,
  p_template_name text,
  p_template_language text,
  p_expiring_today_count integer,
  p_next_7_days_count integer,
  p_next_30_days_count integer,
  p_total_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.whatsapp_notifications%rowtype;
  claimed_id uuid;
begin
  if p_recipient_phone !~ '^\+[1-9][0-9]{7,14}$'
    or p_template_name !~ '^[A-Za-z0-9_]+$'
    or p_template_language !~ '^[a-z]{2,3}(_[A-Z]{2})?$'
    or p_expiring_today_count < 0
    or p_expiring_today_count > p_next_7_days_count
    or p_next_7_days_count > p_next_30_days_count
    or p_total_count <> p_next_30_days_count
    or p_total_count <= 0
    or not exists (
      select 1 from public.organizations
      where id = p_organization_id and is_active and status = 'active'
    ) then
    return null;
  end if;

  select * into current_record
  from public.whatsapp_notifications
  where organization_id = p_organization_id
    and notification_type = 'document_expiry_summary'
    and summary_local_date = p_summary_local_date
  for update;

  if not found then
    insert into public.whatsapp_notifications (
      organization_id, notification_type, summary_local_date, recipient_phone,
      template_name, template_language, expiring_today_count, next_7_days_count,
      next_30_days_count, total_count, status, last_attempt_at
    ) values (
      p_organization_id, 'document_expiry_summary', p_summary_local_date,
      p_recipient_phone, p_template_name, p_template_language,
      p_expiring_today_count, p_next_7_days_count, p_next_30_days_count,
      p_total_count, 'processing', timezone('utc', now())
    ) returning id into claimed_id;
    return claimed_id;
  end if;

  if current_record.status = 'failed'
    and current_record.retryable
    and current_record.retry_count < 2
    and current_record.next_retry_at <= timezone('utc', now()) then
    update public.whatsapp_notifications
    set status = 'processing',
        recipient_phone = p_recipient_phone,
        template_name = p_template_name,
        template_language = p_template_language,
        expiring_today_count = p_expiring_today_count,
        next_7_days_count = p_next_7_days_count,
        next_30_days_count = p_next_30_days_count,
        total_count = p_total_count,
        retry_count = retry_count + 1,
        retryable = false,
        next_retry_at = null,
        last_attempt_at = timezone('utc', now()),
        failed_at = null,
        meta_error_code = null,
        meta_error_title = null,
        meta_error_message = null,
        meta_error_details = null
    where id = current_record.id
    returning id into claimed_id;
    return claimed_id;
  end if;

  return null;
end;
$$;

revoke all on function public.claim_whatsapp_expiry_notification(
  uuid, date, text, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_expiry_notification(
  uuid, date, text, text, text, integer, integer, integer, integer
) to service_role;

comment on function public.claim_whatsapp_expiry_notification(
  uuid, date, text, text, text, integer, integer, integer, integer
) is 'Atomically claims one tenant-local WhatsApp renewal digest or an eligible bounded retry.';
