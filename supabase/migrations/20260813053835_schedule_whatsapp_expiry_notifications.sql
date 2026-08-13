-- Vercel Hobby only supports daily cron jobs, while tenant-local WhatsApp
-- delivery needs a 15-minute dispatcher. Supabase Cron invokes the existing
-- protected application endpoint without placing CRON_SECRET in source or in
-- the cron command itself.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'noteit-whatsapp-expiry-dispatch'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  if exists (
    select 1
    from vault.decrypted_secrets
    where name = 'noteit_cron_secret'
  ) then
    perform cron.schedule(
      'noteit-whatsapp-expiry-dispatch',
      '*/15 * * * *',
      $job$
        select net.http_get(
          url := 'https://noteitapp.com/api/internal/whatsapp-expiry-notifications',
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'noteit_cron_secret'
              limit 1
            )
          ),
          timeout_milliseconds := 10000
        ) as request_id;
      $job$
    );
  else
    raise notice 'WhatsApp expiry cron was not scheduled: Vault secret noteit_cron_secret is absent';
  end if;
end;
$$;
