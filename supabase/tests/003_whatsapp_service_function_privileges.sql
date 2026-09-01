begin;
select plan(12);

select has_function(
  'public',
  'claim_whatsapp_expiry_notification',
  array['uuid','date','text','text','text','integer','integer','integer','integer'],
  'claim function has the canonical identity signature'
);
select is(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.oid = 'public.claim_whatsapp_expiry_notification(uuid,date,text,text,text,integer,integer,integer,integer)'::regprocedure),
  true,
  'claim function remains security definer'
);
select ok(not has_function_privilege('public', 'public.claim_whatsapp_expiry_notification(uuid,date,text,text,text,integer,integer,integer,integer)', 'EXECUTE'), 'PUBLIC cannot execute claim function');
select ok(not has_function_privilege('anon', 'public.claim_whatsapp_expiry_notification(uuid,date,text,text,text,integer,integer,integer,integer)', 'EXECUTE'), 'anon cannot execute claim function');
select ok(not has_function_privilege('authenticated', 'public.claim_whatsapp_expiry_notification(uuid,date,text,text,text,integer,integer,integer,integer)', 'EXECUTE'), 'authenticated cannot execute claim function');
select ok(has_function_privilege('service_role', 'public.claim_whatsapp_expiry_notification(uuid,date,text,text,text,integer,integer,integer,integer)', 'EXECUTE'), 'service_role can execute claim function');

select has_function(
  'public',
  'record_whatsapp_delivery_status',
  array['text','text','timestamp with time zone','integer','text','text','text'],
  'delivery-status function has the canonical identity signature'
);
select is(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.oid = 'public.record_whatsapp_delivery_status(text,text,timestamptz,integer,text,text,text)'::regprocedure),
  true,
  'delivery-status function remains security definer'
);
select ok(not has_function_privilege('public', 'public.record_whatsapp_delivery_status(text,text,timestamptz,integer,text,text,text)', 'EXECUTE'), 'PUBLIC cannot execute delivery-status function');
select ok(not has_function_privilege('anon', 'public.record_whatsapp_delivery_status(text,text,timestamptz,integer,text,text,text)', 'EXECUTE'), 'anon cannot execute delivery-status function');
select ok(not has_function_privilege('authenticated', 'public.record_whatsapp_delivery_status(text,text,timestamptz,integer,text,text,text)', 'EXECUTE'), 'authenticated cannot execute delivery-status function');
select ok(has_function_privilege('service_role', 'public.record_whatsapp_delivery_status(text,text,timestamptz,integer,text,text,text)', 'EXECUTE'), 'service_role can execute delivery-status function');

select * from finish();
rollback;
