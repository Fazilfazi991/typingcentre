-- Sanitized, reproducible metadata snapshot captured through Supabase SQL Editor.
-- This is not a pg_dump: CLI/database credentials were unavailable.
-- It returns schema metadata only and never selects table data or auth users.

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select c.relname as table_name, con.conname as constraint_name,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint as con
join pg_class as c on c.oid = con.conrelid
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public', 'auth')
order by event_object_schema, event_object_table, trigger_name;

select routine_schema, routine_name, security_type, external_language,
       coalesce(array_to_string(proconfig, ', '), '') as function_config
from information_schema.routines
left join pg_proc on pg_proc.proname = information_schema.routines.routine_name
  and pg_proc.pronamespace = information_schema.routines.routine_schema::regnamespace
where routine_schema in ('public', 'security')
order by routine_schema, routine_name;

select table_name, view_definition
from information_schema.views
where table_schema = 'public'
order by table_name;
