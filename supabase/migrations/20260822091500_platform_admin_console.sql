-- Platform console extensions. Existing tenants retain active access.
alter table public.organizations add column if not exists account_state text not null default 'active'
  check (account_state in ('active', 'trial', 'paused', 'suspended', 'cancelled'));
alter table public.organization_subscriptions add column if not exists billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly', 'quarterly', 'yearly', 'custom')),
  add column if not exists amount numeric(12,2),
  add column if not exists currency char(3) not null default 'AED';

-- Preserve existing access semantics rather than treating a legacy suspended or
-- inactive tenant as newly active merely because this column is new.
update public.organizations
set account_state = case
  when status = 'suspended' then 'suspended'
  when status = 'removed' then 'cancelled'
  when not is_active then 'paused'
  else 'active'
end;

create table if not exists public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]+$'), name text not null,
  price numeric(12,2), currency char(3) not null default 'AED', billing_cycle text not null default 'monthly',
  user_allowance integer, customer_allowance integer, document_allowance integer,
  storage_allowance_bytes bigint, ai_allowance integer, whatsapp_allowance integer,
  features jsonb not null default '[]'::jsonb, is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  reference text, amount numeric(12,2) not null check (amount >= 0), currency char(3) not null default 'AED',
  payment_method text not null default 'manual', billing_period_start date, billing_period_end date,
  status text not null check (status in ('paid','pending','failed','refunded','overdue')),
  paid_at timestamptz, notes text, recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_admin_audit_events (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null, action text not null,
  target_type text not null, target_id uuid, before_data jsonb, after_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.platform_admin_notes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null, body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.platform_settings (
  key text primary key, value jsonb not null, updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_payments_organization_created_idx on public.platform_payments(organization_id, created_at desc);
create index if not exists platform_audit_organization_created_idx on public.platform_admin_audit_events(organization_id, created_at desc);
create index if not exists platform_notes_organization_created_idx on public.platform_admin_notes(organization_id, created_at desc);
create index if not exists organizations_account_state_created_idx on public.organizations(account_state, created_at desc);
create index if not exists organization_subscriptions_plan_status_ends_idx on public.organization_subscriptions(plan, status, current_period_ends_at);
drop trigger if exists platform_plans_set_updated_at on public.platform_plans;
create trigger platform_plans_set_updated_at before update on public.platform_plans for each row execute function public.set_updated_at();

alter table public.platform_plans enable row level security;
alter table public.platform_payments enable row level security;
alter table public.platform_admin_audit_events enable row level security;
alter table public.platform_admin_notes enable row level security;
alter table public.platform_settings enable row level security;
revoke all on public.platform_plans, public.platform_payments, public.platform_admin_audit_events, public.platform_admin_notes, public.platform_settings from anon, authenticated;
grant all on public.platform_plans, public.platform_payments, public.platform_admin_audit_events, public.platform_admin_notes, public.platform_settings to service_role;

-- Intentional: browser roles receive no platform-console table access. All console reads and writes
-- pass through server actions that authenticate a platform_admin before using the service credential.
insert into public.platform_plans (code, name, price, billing_cycle)
values ('starter','Starter',null,'monthly'), ('business','Business',null,'monthly'), ('pro','Pro',null,'monthly')
on conflict (code) do nothing;
