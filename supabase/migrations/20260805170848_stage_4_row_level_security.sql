-- Stage 4: database-enforced tenant isolation for the Stage 2/3 public schema.
-- Future CRM/document write stages will add narrow write grants and policies.
create schema if not exists security;
revoke all on schema security from public;
grant usage on schema security to authenticated;

create or replace function security.can_access_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    join public.organizations as organization on organization.id = membership.organization_id
    join public.organization_subscriptions as subscription on subscription.organization_id = organization.id
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
      and organization.is_active
      and subscription.status in ('trial', 'active', 'past_due')
  );
$$;

create or replace function security.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    join public.organizations as organization on organization.id = membership.organization_id
    join public.organization_subscriptions as subscription on subscription.organization_id = organization.id
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
      and organization.status = 'active'
      and organization.is_active
      and subscription.status in ('trial', 'active', 'past_due')
  );
$$;

create or replace function security.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and platform_role = 'platform_admin'
      and status = 'active'
  );
$$;

create or replace function security.is_platform_support()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and platform_role in ('platform_support', 'platform_admin')
      and status = 'active'
  );
$$;

revoke all on function security.can_access_organization(uuid) from public;
revoke all on function security.is_organization_owner(uuid) from public;
revoke all on function security.is_platform_admin() from public;
revoke all on function security.is_platform_support() from public;
grant execute on function security.can_access_organization(uuid) to authenticated;
grant execute on function security.is_organization_owner(uuid) to authenticated;
grant execute on function security.is_platform_admin() to authenticated;
grant execute on function security.is_platform_support() to authenticated;

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and (new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.platform_role is distinct from old.platform_role
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
      or new.updated_at is distinct from old.updated_at) then
    raise exception 'Profile security fields are managed by the platform';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_profile_privilege_changes() from public;
create trigger profiles_prevent_privilege_changes
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_changes();

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, update (name, legal_name, location, timezone, locale, currency, primary_color, logo_url, business_email, phone, whatsapp_number, address) on public.organizations to authenticated;
grant select on public.organization_memberships, public.organization_subscriptions, public.organization_usage_counters to authenticated;
grant select on public.branches, public.companies, public.customers, public.organization_document_types, public.documents, public.renewals, public.follow_ups, public.notifications, public.activity_logs to authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.organization_usage_counters enable row level security;
alter table public.branches enable row level security;
alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.organization_document_types enable row level security;
alter table public.documents enable row level security;
alter table public.renewals enable row level security;
alter table public.follow_ups enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_platform_admin on public.profiles for select to authenticated
  using ((select security.is_platform_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy organizations_select_member_or_platform_admin on public.organizations for select to authenticated
  using ((select security.can_access_organization(id)) or (select security.is_platform_admin()));
create policy organizations_update_owner on public.organizations for update to authenticated
  using ((select security.is_organization_owner(id)))
  with check ((select security.is_organization_owner(id)));

create policy memberships_select_self on public.organization_memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy subscriptions_select_owner_or_platform_admin on public.organization_subscriptions for select to authenticated
  using ((select security.is_organization_owner(organization_id)) or (select security.is_platform_admin()));
create policy usage_select_owner_or_platform_admin on public.organization_usage_counters for select to authenticated
  using ((select security.is_organization_owner(organization_id)) or (select security.is_platform_admin()));

create policy branches_select_member on public.branches for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy companies_select_member on public.companies for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy customers_select_member on public.customers for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy document_types_select_member on public.organization_document_types for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy documents_select_member on public.documents for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy renewals_select_member on public.renewals for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy follow_ups_select_member on public.follow_ups for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy notifications_select_member on public.notifications for select to authenticated
  using ((select security.can_access_organization(organization_id)));
create policy notifications_mark_read on public.notifications for update to authenticated
  using ((select security.can_access_organization(organization_id)))
  with check ((select security.can_access_organization(organization_id)));
create policy activity_logs_select_owner on public.activity_logs for select to authenticated
  using ((select security.is_organization_owner(organization_id)));
