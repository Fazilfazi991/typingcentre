-- Connects the existing document, renewal, follow-up, activity, and versioning
-- models into one tenant-safe renewal workflow. This migration is additive.

alter table public.renewals
  add column replacement_document_id uuid;

alter table public.renewals
  add constraint renewals_replacement_document_tenant_fk
  foreign key (organization_id, replacement_document_id)
  references public.documents (organization_id, id)
  on delete restrict;

create index renewals_organization_document_created_idx
  on public.renewals (organization_id, document_id, created_at desc);

create index renewals_organization_replacement_idx
  on public.renewals (organization_id, replacement_document_id)
  where replacement_document_id is not null;

-- Global search uses leading-wildcard ILIKE. Trigram indexes keep those
-- tenant-scoped lookups responsive as a workspace grows.
create extension if not exists pg_trgm with schema extensions;
create index customers_name_search_idx on public.customers using gin (full_name extensions.gin_trgm_ops);
create index customers_phone_search_idx on public.customers using gin (phone extensions.gin_trgm_ops);
create index customers_passport_search_idx on public.customers using gin (passport_number extensions.gin_trgm_ops);
create index customers_emirates_id_search_idx on public.customers using gin (emirates_id_number extensions.gin_trgm_ops);
create index companies_name_search_idx on public.companies using gin (name extensions.gin_trgm_ops);
create index companies_licence_search_idx on public.companies using gin (licence_number extensions.gin_trgm_ops);
create index documents_name_search_idx on public.documents using gin (display_name extensions.gin_trgm_ops);
create index documents_number_search_idx on public.documents using gin (document_number extensions.gin_trgm_ops);

grant insert (organization_id, document_id, status, started_at, completed_at, notes, replacement_document_id)
  on public.renewals to authenticated;
grant update (status, started_at, completed_at, notes, replacement_document_id)
  on public.renewals to authenticated;

create policy renewals_insert_owner on public.renewals for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy renewals_update_owner on public.renewals for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

create or replace function public.log_workspace_activity(event_kind text, entity_type text, entity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  activity_message text;
begin
  select organization_id into target_organization_id
  from public.organization_memberships
  where user_id = (select auth.uid())
    and is_primary_owner
    and status = 'active';

  if target_organization_id is null or not security.is_organization_owner(target_organization_id) then
    raise exception 'Active owner membership is required';
  end if;

  activity_message := case event_kind
    when 'company_created' then 'Created a company'
    when 'company_updated' then 'Updated a company'
    when 'company_archived' then 'Archived a company'
    when 'branch_created' then 'Created a branch'
    when 'branch_updated' then 'Updated a branch'
    when 'branch_archived' then 'Archived a branch'
    when 'customer_created' then 'Created a customer'
    when 'customer_updated' then 'Updated a customer'
    when 'customer_archived' then 'Archived a customer'
    when 'follow_up_created' then 'Created a follow-up'
    when 'follow_up_updated' then 'Updated a follow-up'
    when 'follow_up_completed' then 'Completed a follow-up'
    when 'renewal_identified' then 'Renewal opportunity identified'
    when 'renewal_contacted' then 'Customer marked as contacted'
    when 'renewal_follow_up_scheduled' then 'Renewal follow-up scheduled'
    when 'renewal_note_added' then 'Renewal note added'
    when 'renewal_completed' then 'Renewal completed and replacement document created'
    when 'renewal_closed' then 'Renewal closed as not interested'
    else null
  end;

  if activity_message is null
    or entity_type not in ('company', 'branch', 'customer', 'follow_up', 'renewal') then
    raise exception 'Unsupported activity event';
  end if;

  if entity_type = 'renewal' and not exists (
    select 1 from public.renewals
    where id = entity_id and organization_id = target_organization_id
  ) then
    raise exception 'Renewal is unavailable';
  end if;

  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  values (target_organization_id, (select auth.uid()), entity_type, entity_id, activity_message);
end;
$$;

revoke all on function public.log_workspace_activity(text, text, uuid) from public;
grant execute on function public.log_workspace_activity(text, text, uuid) to authenticated;

create function public.complete_document_renewal(
  target_document_id uuid,
  replacement_document_number text,
  replacement_issued_on date,
  replacement_expires_on date,
  completion_note text default null
)
returns table (renewal_id uuid, replacement_document_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_organization_id uuid;
  source_document public.documents%rowtype;
  target_renewal_id uuid;
  new_document_id uuid;
begin
  select organization_id into target_organization_id
  from public.organization_memberships
  where user_id = (select auth.uid())
    and is_primary_owner
    and status = 'active';

  if target_organization_id is null or not security.is_organization_owner(target_organization_id) then
    raise exception 'Active owner membership is required';
  end if;
  if replacement_expires_on is null or replacement_expires_on <= current_date then
    raise exception 'The replacement expiry date must be in the future';
  end if;
  if replacement_issued_on is not null and replacement_expires_on <= replacement_issued_on then
    raise exception 'The replacement expiry date must be after its issue date';
  end if;

  select * into source_document
  from public.documents
  where id = target_document_id
    and organization_id = target_organization_id
    and archived_at is null
  for update;

  if source_document.id is null then
    raise exception 'The source document is unavailable';
  end if;

  select id into target_renewal_id
  from public.renewals
  where organization_id = target_organization_id
    and document_id = source_document.id
    and status not in ('completed', 'cancelled')
  order by created_at desc
  limit 1
  for update;

  if target_renewal_id is null then
    insert into public.renewals (organization_id, document_id, status, started_at)
    values (target_organization_id, source_document.id, 'in_progress', timezone('utc', now()))
    returning id into target_renewal_id;
  end if;

  insert into public.documents (
    organization_id, document_type_id, customer_id, company_id, branch_id,
    document_number, display_name, issued_on, expires_on, status, notes
  ) values (
    target_organization_id, source_document.document_type_id, source_document.customer_id,
    source_document.company_id, source_document.branch_id,
    nullif(trim(replacement_document_number), ''), source_document.display_name,
    replacement_issued_on, replacement_expires_on, 'valid',
    nullif(trim(completion_note), '')
  ) returning id into new_document_id;

  update public.documents
  set archived_at = timezone('utc', now())
  where id = source_document.id and organization_id = target_organization_id;

  update public.renewals
  set status = 'completed',
      completed_at = timezone('utc', now()),
      replacement_document_id = new_document_id,
      notes = case
        when nullif(trim(completion_note), '') is null then notes
        when notes is null then trim(completion_note)
        else notes || E'\n' || trim(completion_note)
      end
  where id = target_renewal_id and organization_id = target_organization_id;

  perform public.log_workspace_activity('renewal_completed', 'renewal', target_renewal_id);
  return query select target_renewal_id, new_document_id;
end;
$$;

revoke all on function public.complete_document_renewal(uuid, text, date, date, text) from public;
grant execute on function public.complete_document_renewal(uuid, text, date, date, text) to authenticated;

comment on function public.complete_document_renewal(uuid, text, date, date, text) is
  'Atomically completes a tenant-scoped renewal, archives the old document, and creates its replacement.';
