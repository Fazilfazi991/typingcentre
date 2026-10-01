-- Run only on project ycyiserusoilhrpmszzp after all CRM migrations.
-- Create and email-confirm the fictional Auth user first with the Admin API.
-- This script creates exactly one demo workspace and fills it with fictional data.
begin;

do $$
declare
  target_owner_id uuid;
  target_organization_id uuid;
begin
  if current_database() <> 'postgres' then
    raise exception 'Unexpected database';
  end if;

  select id into strict target_owner_id
  from auth.users
  where email = 'demo.owner@example.invalid' and email_confirmed_at is not null;

  if exists (
    select 1 from public.organization_memberships
    where user_id = target_owner_id and status = 'active'
  ) then
    raise exception 'Demo owner already has an active workspace';
  end if;
  if exists (select 1 from public.organizations where slug = 'note-it-demo') then
    raise exception 'Demo workspace already exists';
  end if;

  perform set_config('request.jwt.claim.sub',target_owner_id::text,true);
  target_organization_id := public.provision_current_user_workspace(
    'Note It Demo Typing Centre','Dubai','Demo Owner',null
  );
  update public.organizations
  set slug = 'note-it-demo', onboarding_step = 4,
      onboarding_completed_at = now()
  where id = target_organization_id;

  perform public.reset_note_it_demo_workspace();
  raise notice 'Created fictional demo organization %', target_organization_id;
end $$;

commit;
