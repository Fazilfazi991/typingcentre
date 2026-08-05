-- Stage 3 authentication foundation. RLS policies are deliberately deferred to Stage 4.
create type public.platform_role as enum ('none', 'platform_support', 'platform_admin');
create type public.record_status as enum ('active', 'suspended', 'removed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  platform_role public.platform_role not null default 'none',
  status public.record_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.organization_memberships
  add column status public.record_status not null default 'active',
  add column is_primary_owner boolean not null default false;

alter table public.organizations
  add column legal_name text,
  add column business_email text,
  add column phone text,
  add column whatsapp_number text,
  add column address text,
  add column status public.record_status not null default 'active';

create table public.organization_usage_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  stored_bytes bigint not null default 0 check (stored_bytes >= 0),
  document_count integer not null default 0 check (document_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index organization_memberships_primary_owner_idx
  on public.organization_memberships (user_id)
  where is_primary_owner and status = 'active';

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.onboard_current_user(
  organization_name text,
  organization_slug text,
  organization_location text,
  organization_email text,
  organization_phone text,
  organization_whatsapp text,
  organization_address text,
  organization_color text,
  subscription_plan public.subscription_plan default 'starter'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  new_organization_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if exists (select 1 from public.organization_memberships where user_id = current_user_id and status = 'active') then
    raise exception 'An active organization membership already exists';
  end if;
  if not (organization_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') or char_length(organization_slug) not between 3 and 63 then
    raise exception 'Invalid organization slug';
  end if;
  if organization_slug = any (array['admin','platform','api','login','auth','dashboard','support','settings','billing','www']) then
    raise exception 'Reserved organization slug';
  end if;
  insert into public.organizations (name, legal_name, slug, location, business_email, phone, whatsapp_number, address, primary_color)
  values (trim(organization_name), null, organization_slug, trim(organization_location), nullif(lower(trim(organization_email)), ''), nullif(trim(organization_phone), ''), nullif(trim(organization_whatsapp), ''), nullif(trim(organization_address), ''), organization_color)
  returning id into new_organization_id;
  insert into public.organization_memberships (organization_id, user_id, role, is_primary_owner)
  values (new_organization_id, current_user_id, 'owner', true);
  insert into public.organization_subscriptions (organization_id, plan, status, trial_ends_at)
  values (new_organization_id, subscription_plan, 'trial', timezone('utc', now()) + interval '14 days');
  insert into public.organization_usage_counters (organization_id) values (new_organization_id);
  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  values (new_organization_id, current_user_id, 'organization', new_organization_id, 'Organization onboarding completed');
  return new_organization_id;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.onboard_current_user(text, text, text, text, text, text, text, text, public.subscription_plan) from public;
grant execute on function public.onboard_current_user(text, text, text, text, text, text, text, text, public.subscription_plan) to authenticated;

comment on function public.onboard_current_user is 'Stage 3 temporary onboarding boundary. It derives the user from auth.uid(); Stage 4 RLS will protect all tenant rows.';
