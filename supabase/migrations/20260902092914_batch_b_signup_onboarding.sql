-- Batch B: atomic, idempotent workspace provisioning for authenticated users.
-- The caller supplies business facts only; tenant identity, owner role, plan,
-- slug, and authorization are derived and enforced inside this transaction.
create or replace function public.provision_current_user_workspace(
  workspace_name text,
  workspace_location text,
  owner_display_name text default null,
  workspace_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_organization_id uuid;
  new_organization_id uuid;
  generated_slug text;
  normalized_name text := trim(coalesce(workspace_name, ''));
  normalized_location text := trim(coalesce(workspace_location, ''));
  normalized_owner text := nullif(trim(coalesce(owner_display_name, '')), '');
  normalized_phone text := nullif(trim(coalesce(workspace_phone, '')), '');
  current_email text;
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;

  select m.organization_id into existing_organization_id
  from public.organization_memberships m
  where m.user_id = current_user_id and m.status = 'active'
  order by m.is_primary_owner desc, m.created_at
  limit 1;
  if existing_organization_id is not null then return existing_organization_id; end if;

  select p.email into current_email
  from public.profiles p
  where p.id = current_user_id and p.status = 'active' and p.platform_role = 'none';
  if not found then raise exception 'Only an active workspace user can create a workspace'; end if;
  if char_length(normalized_name) not between 2 and 160 then raise exception 'Invalid workspace name'; end if;
  if char_length(normalized_location) not between 2 and 120 then raise exception 'Invalid workspace location'; end if;
  if normalized_phone is not null and char_length(normalized_phone) not between 7 and 24 then raise exception 'Invalid phone number'; end if;

  generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g'));
  if char_length(generated_slug) < 3 then generated_slug := 'workspace'; end if;
  generated_slug := left(generated_slug, 52) || '-' || left(replace(current_user_id::text, '-', ''), 8);

  insert into public.organizations (
    name, slug, location, business_email, phone, primary_color,
    onboarding_step, onboarding_completed_at
  ) values (
    normalized_name, generated_slug, normalized_location, nullif(lower(trim(current_email)), ''),
    normalized_phone, '#0E7BFF', 2, null
  ) returning id into new_organization_id;

  insert into public.organization_memberships (organization_id, user_id, role, status, is_primary_owner)
  values (new_organization_id, current_user_id, 'owner', 'active', true);
  insert into public.organization_subscriptions (organization_id, plan, status, trial_ends_at)
  values (new_organization_id, 'starter', 'trial', timezone('utc', now()) + interval '14 days');
  insert into public.organization_usage_counters (organization_id) values (new_organization_id);
  insert into public.organization_document_types (organization_id, name, canonical_code, is_active)
  values
    (new_organization_id, 'Emirates ID', 'emirates_id', true),
    (new_organization_id, 'Passport', 'passport', true),
    (new_organization_id, 'Trade Licence', 'trade_licence', true),
    (new_organization_id, 'Residence Visa', 'residence_visa', true),
    (new_organization_id, 'Labour Card', 'labour_card', true),
    (new_organization_id, 'Medical Insurance', 'medical_insurance', true),
    (new_organization_id, 'Tenancy Contract / Ejari', 'tenancy_contract', true);
  update public.profiles set full_name = coalesce(normalized_owner, full_name) where id = current_user_id;
  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  values (new_organization_id, current_user_id, 'organization', new_organization_id, 'Workspace created; onboarding in progress');
  return new_organization_id;
end;
$$;

revoke all on function public.provision_current_user_workspace(text, text, text, text) from public, anon;
grant execute on function public.provision_current_user_workspace(text, text, text, text) to authenticated;
comment on function public.provision_current_user_workspace(text, text, text, text)
  is 'Creates one owner workspace atomically. Tenant ID, slug, role, defaults, and plan are server-controlled.';
