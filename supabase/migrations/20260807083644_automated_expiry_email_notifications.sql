-- Daily, tenant-scoped delivery ledger. It is intentionally not exposed to browser roles.
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notification_type text not null check (notification_type = 'expiry_daily_digest'),
  recipient_email text not null,
  notification_date date not null,
  document_count integer not null check (document_count >= 0),
  status text not null check (status in ('processing', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, notification_type, notification_date)
);

create index notification_logs_organization_created_idx
  on public.notification_logs (organization_id, created_at desc);

alter table public.notification_logs enable row level security;
revoke all on public.notification_logs from anon, authenticated;

create trigger notification_logs_set_updated_at before update on public.notification_logs
  for each row execute function public.set_updated_at();

comment on table public.notification_logs is 'Server-only audit and idempotency ledger for transactional notifications.';
