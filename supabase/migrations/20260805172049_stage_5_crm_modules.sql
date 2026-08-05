-- Stage 5 CRM foundation. Apply manually through SQL Editor while the CLI ledger is pending.
alter table public.companies
  add column trade_name text,
  add column industry text,
  add column business_activity text,
  add column company_type text,
  add column establishment_card_number text,
  add column immigration_file_number text,
  add column vat_registration_number text,
  add column corporate_tax_registration_number text,
  add column whatsapp_number text,
  add column address text,
  add column status public.record_status not null default 'active',
  add column archived_at timestamptz,
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.branches
  add column company_id uuid,
  add column code text,
  add column contact_name text,
  add column whatsapp_number text,
  add column email text,
  add column trade_licence_number text,
  add column notes text,
  add column status public.record_status not null default 'active',
  add column archived_at timestamptz,
  add column created_by uuid references auth.users(id) on delete set null,
  add constraint branches_company_same_tenant_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete restrict;

alter table public.customers
  add column customer_type text not null default 'individual' check (customer_type in ('individual', 'employee', 'dependent', 'corporate_contact')),
  add column date_of_birth date,
  add column gender text check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  add column whatsapp_number text,
  add column residential_address text,
  add column sponsor_name text,
  add column sponsor_company text,
  add column visa_type text,
  add column profession text,
  add column status public.record_status not null default 'active',
  add column archived_at timestamptz,
  add column created_by uuid references auth.users(id) on delete set null;

create unique index branches_active_code_idx
  on public.branches (organization_id, company_id, code)
  where code is not null and archived_at is null;
create unique index customers_active_passport_idx
  on public.customers (organization_id, passport_number)
  where passport_number is not null and archived_at is null;
create unique index customers_active_emirates_id_idx
  on public.customers (organization_id, emirates_id_number)
  where emirates_id_number is not null and archived_at is null;
create index companies_active_name_search_idx
  on public.companies (organization_id, lower(name))
  where archived_at is null;
create index customers_active_name_search_idx
  on public.customers (organization_id, lower(full_name))
  where archived_at is null;

create or replace function public.set_record_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create or replace function public.prevent_tenant_transfer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Organization cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.validate_customer_branch_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.branch_id is not null then
    if new.company_id is null then
      raise exception 'A company is required when selecting a branch';
    end if;
    if not exists (
      select 1
      from public.branches
      where id = new.branch_id
        and organization_id = new.organization_id
        and company_id = new.company_id
        and archived_at is null
    ) then
      raise exception 'Selected branch does not belong to the selected company';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.set_record_creator() from public;
revoke all on function public.prevent_tenant_transfer() from public;
revoke all on function public.validate_customer_branch_company() from public;

create trigger companies_set_creator before insert on public.companies
  for each row execute function public.set_record_creator();
create trigger branches_set_creator before insert on public.branches
  for each row execute function public.set_record_creator();
create trigger customers_set_creator before insert on public.customers
  for each row execute function public.set_record_creator();
create trigger companies_prevent_tenant_transfer before update on public.companies
  for each row execute function public.prevent_tenant_transfer();
create trigger branches_prevent_tenant_transfer before update on public.branches
  for each row execute function public.prevent_tenant_transfer();
create trigger customers_prevent_tenant_transfer before update on public.customers
  for each row execute function public.prevent_tenant_transfer();
create trigger customers_validate_branch_company before insert or update on public.customers
  for each row execute function public.validate_customer_branch_company();

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
    when 'follow_up_completed' then 'Completed a follow-up'
    else null
  end;

  if activity_message is null or entity_type not in ('company', 'branch', 'customer', 'follow_up') then
    raise exception 'Unsupported activity event';
  end if;

  insert into public.activity_logs (organization_id, actor_user_id, entity_type, entity_id, message)
  values (target_organization_id, (select auth.uid()), entity_type, entity_id, activity_message);
end;
$$;

revoke all on function public.log_workspace_activity(text, text, uuid) from public;
grant execute on function public.log_workspace_activity(text, text, uuid) to authenticated;

drop policy companies_select_member on public.companies;
drop policy branches_select_member on public.branches;
drop policy customers_select_member on public.customers;

create policy companies_select_active_member on public.companies for select to authenticated
  using (archived_at is null and (select security.can_access_organization(organization_id)));
create policy companies_insert_owner on public.companies for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy companies_update_owner on public.companies for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

create policy branches_select_active_member on public.branches for select to authenticated
  using (archived_at is null and (select security.can_access_organization(organization_id)));
create policy branches_insert_owner on public.branches for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy branches_update_owner on public.branches for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

create policy customers_select_active_member on public.customers for select to authenticated
  using (archived_at is null and (select security.can_access_organization(organization_id)));
create policy customers_insert_owner on public.customers for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy customers_update_owner on public.customers for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

create policy follow_ups_insert_owner on public.follow_ups for insert to authenticated
  with check ((select security.is_organization_owner(organization_id)));
create policy follow_ups_update_owner on public.follow_ups for update to authenticated
  using ((select security.is_organization_owner(organization_id)))
  with check ((select security.is_organization_owner(organization_id)));

grant insert (organization_id, name, trade_name, industry, business_activity, company_type, licence_number, contact_name, contact_phone, contact_email, city, establishment_card_number, immigration_file_number, vat_registration_number, corporate_tax_registration_number, whatsapp_number, address, status, is_active), update (name, trade_name, industry, business_activity, company_type, licence_number, contact_name, contact_phone, contact_email, city, establishment_card_number, immigration_file_number, vat_registration_number, corporate_tax_registration_number, whatsapp_number, address, status, archived_at, is_active) on public.companies to authenticated;
grant insert (organization_id, company_id, name, code, address, city, phone, contact_name, whatsapp_number, email, trade_licence_number, notes, status, is_active), update (company_id, name, code, address, city, phone, contact_name, whatsapp_number, email, trade_licence_number, notes, status, archived_at, is_active) on public.branches to authenticated;
grant insert (organization_id, company_id, branch_id, full_name, email, phone, nationality, passport_number, emirates_id_number, notes, customer_type, date_of_birth, gender, whatsapp_number, residential_address, sponsor_name, sponsor_company, visa_type, profession, status, is_active), update (company_id, branch_id, full_name, email, phone, nationality, passport_number, emirates_id_number, notes, customer_type, date_of_birth, gender, whatsapp_number, residential_address, sponsor_name, sponsor_company, visa_type, profession, status, archived_at, is_active) on public.customers to authenticated;
grant insert (organization_id, customer_id, document_id, due_at, status, completed_at, note), update (customer_id, document_id, due_at, status, completed_at, note) on public.follow_ups to authenticated;
