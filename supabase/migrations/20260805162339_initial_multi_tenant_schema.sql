-- RenewTrack Stage 2: structure only. RLS policies are deliberately introduced in Stage 4.
create extension if not exists pgcrypto;

create type public.subscription_plan as enum ('starter', 'business', 'pro');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'suspended', 'cancelled');
create type public.member_role as enum ('owner', 'admin');
create type public.document_status as enum ('valid', 'expiring_soon', 'urgent', 'expires_today', 'expired', 'renewal_in_progress');
create type public.renewal_status as enum ('draft', 'in_progress', 'submitted', 'completed', 'cancelled');
create type public.follow_up_status as enum ('pending', 'completed', 'overdue', 'cancelled');
create type public.notification_channel as enum ('in_app', 'email', 'whatsapp');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  location text not null check (char_length(trim(location)) between 2 and 120),
  timezone text not null default 'Asia/Dubai',
  locale text not null default 'en-AE',
  currency char(3) not null default 'AED',
  primary_color text not null default '#2563EB' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id),
  unique (id, organization_id)
);

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan public.subscription_plan not null default 'starter',
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  storage_quota_bytes bigint not null default 0 check (storage_quota_bytes >= 0),
  document_quota integer check (document_quota is null or document_quota >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, organization_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  address text,
  city text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 160),
  licence_number text,
  contact_name text,
  contact_phone text,
  contact_email text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, licence_number),
  foreign key (organization_id, branch_id) references public.branches (organization_id, id) on delete set null (branch_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid,
  branch_id uuid,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text,
  phone text not null,
  nationality text,
  passport_number text,
  emirates_id_number text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, company_id) references public.companies (organization_id, id) on delete set null (company_id),
  foreign key (organization_id, branch_id) references public.branches (organization_id, id) on delete set null (branch_id)
);

create table public.organization_document_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  reminder_thresholds integer[] not null default array[90, 60, 30, 15, 7, 3, 0],
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, name),
  check (array_length(reminder_thresholds, 1) > 0),
  check (reminder_thresholds <@ array[0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 15, 30, 45, 60, 90, 120, 180])
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type_id uuid not null,
  customer_id uuid,
  company_id uuid,
  branch_id uuid,
  document_number text,
  issued_on date,
  expires_on date not null,
  status public.document_status not null default 'valid',
  reminder_thresholds integer[],
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique nulls not distinct (organization_id, document_number),
  foreign key (organization_id, document_type_id) references public.organization_document_types (organization_id, id) on delete restrict,
  foreign key (organization_id, customer_id) references public.customers (organization_id, id) on delete restrict,
  foreign key (organization_id, company_id) references public.companies (organization_id, id) on delete restrict,
  foreign key (organization_id, branch_id) references public.branches (organization_id, id) on delete set null (branch_id),
  check (issued_on is null or expires_on > issued_on),
  check (customer_id is not null or company_id is not null)
);

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  status public.renewal_status not null default 'draft',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, document_id) references public.documents (organization_id, id) on delete cascade,
  check ((status <> 'completed') or completed_at is not null)
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  document_id uuid,
  due_at timestamptz not null,
  status public.follow_up_status not null default 'pending',
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id) on delete cascade,
  foreign key (organization_id, document_id) references public.documents (organization_id, id) on delete set null,
  check ((status <> 'completed') or completed_at is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  document_id uuid,
  channel public.notification_channel not null default 'in_app',
  title text not null,
  body text not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id) on delete set null (customer_id),
  foreign key (organization_id, document_id) references public.documents (organization_id, id) on delete set null (document_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index companies_organization_active_idx on public.companies (organization_id, is_active);
create index customers_organization_company_idx on public.customers (organization_id, company_id);
create index documents_organization_expiry_idx on public.documents (organization_id, expires_on) where archived_at is null;
create index documents_organization_status_idx on public.documents (organization_id, status) where archived_at is null;
create index renewals_organization_status_idx on public.renewals (organization_id, status);
create index follow_ups_organization_due_idx on public.follow_ups (organization_id, due_at) where status in ('pending', 'overdue');
create index notifications_organization_unread_idx on public.notifications (organization_id, created_at desc) where read_at is null;
create index activity_logs_organization_created_idx on public.activity_logs (organization_id, created_at desc);
create index audit_logs_organization_created_idx on public.audit_logs (organization_id, created_at desc);

create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.organization_subscriptions for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger document_types_set_updated_at before update on public.organization_document_types for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger renewals_set_updated_at before update on public.renewals for each row execute function public.set_updated_at();
create trigger follow_ups_set_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();

comment on table public.organization_memberships is 'Prepared for Stage 3 authentication and Stage 4 RLS. No policies are created in Stage 2.';
comment on table public.documents is 'Document metadata only. R2 object metadata and signed uploads are deferred to Stage 6.';
