-- Run after hosted-note-it-demo.sql on the dedicated fictional Note It demo tenant.
-- The service catalog and work orders are also restored by reset_note_it_demo_workspace().
begin;
do $$
declare target_organization_id uuid; target_owner_id uuid;
begin
  select id into target_organization_id from public.organizations where slug = 'note-it-demo' and is_active = true;
  if target_organization_id is null then raise exception 'Dedicated demo tenant was not found'; end if;
  select user_id into strict target_owner_id from public.organization_memberships
  where organization_id = target_organization_id and is_primary_owner and status = 'active';
  perform security.seed_note_it_service_demo(target_organization_id,target_owner_id);
end $$;
commit;
