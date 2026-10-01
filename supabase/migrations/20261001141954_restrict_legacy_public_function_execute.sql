-- Trigger handlers are invoked by their triggers. API roles must not be able
-- to call these SECURITY DEFINER functions directly through PostgREST.
-- Three legacy workspace/document RPCs remain available to signed-in users.
do $$
declare
  target record;
begin
  for target in
    select p.oid::regprocedure as signature,
           p.proname,
           exists (
             select 1 from pg_trigger t
             where t.tgfoid = p.oid and not t.tgisinternal
           ) as is_trigger_handler
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        exists (
          select 1 from pg_trigger t
          where t.tgfoid = p.oid and not t.tgisinternal
        )
        or p.proname in (
          'finalize_document_version',
          'log_workspace_activity',
          'onboard_current_user'
        )
      )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      target.signature
    );
    if not target.is_trigger_handler then
      execute format(
        'grant execute on function %s to authenticated',
        target.signature
      );
    end if;
  end loop;
end $$;
