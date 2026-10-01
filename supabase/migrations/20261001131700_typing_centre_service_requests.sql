-- Typing centre operations. All links to existing records include organization_id.
create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  category text not null check (category in ('Residency & Visa','Emirates ID','MOHRE / Labour','Medical','Company / Business','Documents','Other')),
  description text,
  government_fee numeric(12,2) not null default 0 check (government_fee >= 0),
  service_fee numeric(12,2) not null default 0 check (service_fee >= 0),
  expected_days integer not null default 1 check (expected_days between 0 and 3650),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id), unique (organization_id,code)
);

create table public.service_catalog_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 160),
  document_type_id uuid,
  required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,service_id) references public.service_catalog(organization_id,id) on delete cascade,
  foreign key (organization_id,document_type_id) references public.organization_document_types(organization_id,id) on delete restrict
);

create table public.service_request_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  next_number bigint not null default 1 check (next_number > 0)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_number text not null,
  customer_id uuid not null,
  company_id uuid,
  service_id uuid not null,
  assigned_to uuid,
  status text not null default 'new' check (status in ('new','waiting_documents','ready_to_submit','submitted','processing','action_required','ready_for_collection','completed','cancelled','rejected')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  source text not null default 'walk_in' check (source in ('walk_in','phone','whatsapp','online','other')),
  application_reference text,
  external_reference text,
  government_fee numeric(12,2) not null default 0 check (government_fee >= 0),
  other_cost numeric(12,2) not null default 0 check (other_cost >= 0),
  service_fee numeric(12,2) not null default 0 check (service_fee >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0 and discount <= government_fee + other_cost + service_fee),
  total_amount numeric(12,2) generated always as (government_fee + other_cost + service_fee - discount) stored,
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0 and paid_amount <= government_fee + other_cost + service_fee - discount),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','part_paid','paid')),
  submitted_at timestamptz,
  expected_completion_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id,id), unique (organization_id,request_number),
  unique (organization_id,id,customer_id),
  foreign key (organization_id,customer_id) references public.customers(organization_id,id) on delete restrict,
  foreign key (organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key (organization_id,service_id) references public.service_catalog(organization_id,id) on delete restrict,
  foreign key (organization_id,assigned_to) references public.organization_memberships(organization_id,user_id) on delete restrict
);

create table public.service_request_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_request_id uuid not null,
  name text not null,
  document_type_id uuid,
  required boolean not null,
  sort_order integer not null,
  status text not null default 'missing' check (status in ('missing','received','verified','not_required')),
  document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,service_request_id) references public.service_requests(organization_id,id) on delete cascade,
  foreign key (organization_id,document_type_id) references public.organization_document_types(organization_id,id) on delete restrict,
  foreign key (organization_id,document_id) references public.documents(organization_id,id) on delete restrict,
  check (status not in ('received','verified') or document_id is not null)
);

create table public.service_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_request_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash','card','bank_transfer','other')),
  reference text,
  paid_at timestamptz not null default now(),
  received_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,service_request_id) references public.service_requests(organization_id,id) on delete restrict
);

alter table public.follow_ups add column service_request_id uuid;
alter table public.follow_ups add constraint follow_ups_request_customer_fkey
  foreign key (organization_id,service_request_id,customer_id)
  references public.service_requests(organization_id,id,customer_id) on delete restrict;
grant insert(service_request_id) on public.follow_ups to authenticated;

create index service_requests_status_idx on public.service_requests(organization_id,status,created_at desc) where archived_at is null;
create index service_requests_customer_idx on public.service_requests(organization_id,customer_id,created_at desc);
create index service_requests_company_idx on public.service_requests(organization_id,company_id,created_at desc);
create index service_requests_assigned_idx on public.service_requests(organization_id,assigned_to,status);
create index service_request_requirements_request_idx on public.service_request_requirements(organization_id,service_request_id,sort_order);
create index service_payments_request_idx on public.service_payments(organization_id,service_request_id,paid_at desc);

create trigger services_updated before update on public.service_catalog for each row execute function public.set_updated_at();
create trigger service_requirements_updated before update on public.service_catalog_requirements for each row execute function public.set_updated_at();
create trigger service_requests_updated before update on public.service_requests for each row execute function public.set_updated_at();
create trigger service_request_requirements_updated before update on public.service_request_requirements for each row execute function public.set_updated_at();

create function public.prepare_service_request() returns trigger language plpgsql security definer set search_path = '' as $$
declare service_row public.service_catalog%rowtype; sequence_number bigint;
begin
  if (select auth.uid()) is null or not security.is_organization_owner(new.organization_id) then raise exception 'Active workspace owner required'; end if;
  select * into service_row from public.service_catalog where id = new.service_id and organization_id = new.organization_id and is_active;
  if not found then raise exception 'Service is unavailable'; end if;
  if not exists (select 1 from public.customers where organization_id = new.organization_id and id = new.customer_id and archived_at is null) then raise exception 'Customer is unavailable'; end if;
  if new.company_id is not null and not exists (select 1 from public.customers where organization_id = new.organization_id and id = new.customer_id and company_id = new.company_id) then raise exception 'Customer does not belong to this company'; end if;
  insert into public.service_request_counters(organization_id,next_number) values (new.organization_id,2)
    on conflict (organization_id) do update set next_number = public.service_request_counters.next_number + 1
    returning next_number - 1 into sequence_number;
  new.request_number := 'SR-' || lpad(sequence_number::text,6,'0');
  new.created_by := (select auth.uid());
  new.status := 'new'; new.government_fee := service_row.government_fee; new.service_fee := service_row.service_fee;
  new.other_cost := 0; new.discount := 0; new.paid_amount := 0; new.payment_status := 'unpaid';
  if new.expected_completion_at is null then new.expected_completion_at := now() + make_interval(days => service_row.expected_days); end if;
  return new;
end $$;

create function public.validate_service_request_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id or new.request_number is distinct from old.request_number
     or new.customer_id is distinct from old.customer_id or new.service_id is distinct from old.service_id
     or new.created_by is distinct from old.created_by then raise exception 'Request identity cannot be changed'; end if;
  if current_user = 'authenticated' and (new.paid_amount is distinct from old.paid_amount or new.payment_status is distinct from old.payment_status) then raise exception 'Payment totals are derived from payments'; end if;
  if old.status <> new.status then
    if not (
      (old.status = 'new' and new.status in ('waiting_documents','ready_to_submit','cancelled')) or
      (old.status = 'waiting_documents' and new.status in ('ready_to_submit','cancelled')) or
      (old.status = 'ready_to_submit' and new.status in ('waiting_documents','submitted','cancelled')) or
      (old.status = 'submitted' and new.status in ('processing','action_required','rejected')) or
      (old.status = 'processing' and new.status in ('action_required','ready_for_collection','rejected')) or
      (old.status = 'action_required' and new.status in ('waiting_documents','ready_to_submit','submitted','processing','rejected')) or
      (old.status = 'ready_for_collection' and new.status in ('completed','action_required'))
    ) then raise exception 'Invalid service request status transition'; end if;
    if new.status in ('ready_to_submit','submitted') and exists (
      select 1 from public.service_request_requirements r where r.organization_id = new.organization_id
      and r.service_request_id = new.id and r.required and r.status = 'missing'
    ) then raise exception 'Required documents are still missing'; end if;
    if new.status = 'submitted' then new.submitted_at := coalesce(new.submitted_at,now()); end if;
    if new.status = 'completed' then new.completed_at := coalesce(new.completed_at,now()); end if;
  end if;
  if new.company_id is not null and not exists (select 1 from public.customers where organization_id = new.organization_id and id = new.customer_id and company_id = new.company_id) then raise exception 'Customer does not belong to this company'; end if;
  new.payment_status := case when new.paid_amount = 0 then 'unpaid'
    when new.paid_amount < new.government_fee + new.other_cost + new.service_fee - new.discount then 'part_paid'
    else 'paid' end;
  return new;
end $$;

create function public.copy_service_requirements() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.service_request_requirements(organization_id,service_request_id,name,document_type_id,required,sort_order)
  select new.organization_id,new.id,r.name,r.document_type_id,r.required,r.sort_order
  from public.service_catalog_requirements r where r.organization_id = new.organization_id and r.service_id = new.service_id;
  insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message)
  values(new.organization_id,(select auth.uid()),'service_request',new.id,'Created service request ' || new.request_number);
  return new;
end $$;

create function public.validate_request_requirement() returns trigger language plpgsql set search_path = '' as $$
declare owner_id uuid; linked_type uuid;
begin
  if new.organization_id is distinct from old.organization_id or new.service_request_id is distinct from old.service_request_id
     or new.name is distinct from old.name or new.required is distinct from old.required or new.document_type_id is distinct from old.document_type_id then raise exception 'Checklist definition cannot be changed'; end if;
  if new.document_id is not null then
    select d.customer_id,d.document_type_id into owner_id,linked_type from public.documents d
    where d.organization_id = new.organization_id and d.id = new.document_id and d.archived_at is null;
    if owner_id is null or owner_id <> (select customer_id from public.service_requests where organization_id = new.organization_id and id = new.service_request_id) then raise exception 'Document must belong to the request customer'; end if;
    if new.document_type_id is not null and linked_type <> new.document_type_id then raise exception 'Document type does not match the checklist item'; end if;
  end if;
  if new.status in ('received','verified') and new.document_id is null then raise exception 'Attach a document first'; end if;
  return new;
end $$;

create function public.log_service_request_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message)
    values(new.organization_id,(select auth.uid()),'service_request',new.id,'Status changed to ' || replace(new.status,'_',' '));
  end if;
  if new.application_reference is distinct from old.application_reference and new.application_reference is not null then
    insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message)
    values(new.organization_id,(select auth.uid()),'service_request',new.id,'Application reference added');
  end if;
  return new;
end $$;

create function public.log_service_requirement_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.document_id is distinct from old.document_id then
    insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message)
    values(new.organization_id,(select auth.uid()),'service_request',new.service_request_id,
      'Requirement ' || new.name || ' marked ' || replace(new.status,'_',' '));
  end if;
  return new;
end $$;

create function public.prepare_service_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare request_row public.service_requests%rowtype;
begin
  if (select auth.uid()) is null or not security.is_organization_owner(new.organization_id) then raise exception 'Active workspace owner required'; end if;
  select * into request_row from public.service_requests where organization_id = new.organization_id and id = new.service_request_id for update;
  if not found then raise exception 'Request is unavailable'; end if;
  if request_row.archived_at is not null or request_row.status in ('cancelled','rejected') then raise exception 'Cannot pay a closed request'; end if;
  if new.amount > request_row.total_amount - request_row.paid_amount then raise exception 'Payment exceeds balance'; end if;
  new.received_by := (select auth.uid());
  return new;
end $$;

create function public.apply_service_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare new_paid numeric(12,2); request_total numeric(12,2);
begin
  select coalesce(sum(amount),0) into new_paid from public.service_payments where organization_id = new.organization_id and service_request_id = new.service_request_id;
  select total_amount into request_total from public.service_requests where organization_id = new.organization_id and id = new.service_request_id;
  update public.service_requests set paid_amount = new_paid,
    payment_status = case when new_paid = 0 then 'unpaid' when new_paid < request_total then 'part_paid' else 'paid' end
  where organization_id = new.organization_id and id = new.service_request_id;
  insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message,metadata)
  values(new.organization_id,(select auth.uid()),'service_request',new.service_request_id,'Payment recorded',jsonb_build_object('amount',new.amount,'method',new.method));
  return new;
end $$;

create function public.log_service_follow_up() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.service_request_id is not null then
    insert into public.activity_logs(organization_id,actor_user_id,entity_type,entity_id,message)
    values(new.organization_id,(select auth.uid()),'service_request',new.service_request_id,'Follow-up created');
  end if;
  return new;
end $$;

create trigger service_request_prepare before insert on public.service_requests for each row execute function public.prepare_service_request();
create trigger services_prevent_tenant_transfer before update on public.service_catalog for each row execute function public.prevent_tenant_transfer();
create trigger service_requirements_prevent_tenant_transfer before update on public.service_catalog_requirements for each row execute function public.prevent_tenant_transfer();
create trigger service_request_validate before update on public.service_requests for each row execute function public.validate_service_request_update();
create trigger service_request_copy after insert on public.service_requests for each row execute function public.copy_service_requirements();
create trigger service_request_log after update on public.service_requests for each row execute function public.log_service_request_change();
create trigger service_requirement_validate before update on public.service_request_requirements for each row execute function public.validate_request_requirement();
create trigger service_requirement_log after update on public.service_request_requirements for each row execute function public.log_service_requirement_change();
create trigger service_payment_prepare before insert on public.service_payments for each row execute function public.prepare_service_payment();
create trigger service_payment_apply after insert on public.service_payments for each row execute function public.apply_service_payment();
create trigger service_follow_up_log after insert on public.follow_ups for each row execute function public.log_service_follow_up();

revoke all on function public.prepare_service_request(), public.copy_service_requirements(), public.log_service_request_change(),
  public.log_service_requirement_change(), public.prepare_service_payment(), public.apply_service_payment(), public.log_service_follow_up() from public, anon, authenticated;

alter table public.service_catalog enable row level security;
alter table public.service_catalog_requirements enable row level security;
alter table public.service_request_counters enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_request_requirements enable row level security;
alter table public.service_payments enable row level security;

create policy services_read on public.service_catalog for select to authenticated using (security.can_access_organization(organization_id));
create policy services_insert on public.service_catalog for insert to authenticated with check (security.is_organization_owner(organization_id));
create policy services_update on public.service_catalog for update to authenticated using (security.is_organization_owner(organization_id)) with check (security.is_organization_owner(organization_id));
create policy requirements_read on public.service_catalog_requirements for select to authenticated using (security.can_access_organization(organization_id));
create policy requirements_insert on public.service_catalog_requirements for insert to authenticated with check (security.is_organization_owner(organization_id));
create policy requirements_update on public.service_catalog_requirements for update to authenticated using (security.is_organization_owner(organization_id)) with check (security.is_organization_owner(organization_id));
create policy requirements_delete on public.service_catalog_requirements for delete to authenticated using (security.is_organization_owner(organization_id));
create policy requests_read on public.service_requests for select to authenticated using (security.can_access_organization(organization_id));
create policy requests_insert on public.service_requests for insert to authenticated with check (security.is_organization_owner(organization_id));
create policy requests_update on public.service_requests for update to authenticated using (security.is_organization_owner(organization_id)) with check (security.is_organization_owner(organization_id));
create policy request_requirements_read on public.service_request_requirements for select to authenticated using (security.can_access_organization(organization_id));
create policy request_requirements_update on public.service_request_requirements for update to authenticated using (security.is_organization_owner(organization_id)) with check (security.is_organization_owner(organization_id));
create policy payments_read on public.service_payments for select to authenticated using (security.can_access_organization(organization_id));
create policy payments_insert on public.service_payments for insert to authenticated with check (security.is_organization_owner(organization_id));

grant select,insert,update on public.service_catalog,public.service_catalog_requirements to authenticated;
grant select,insert on public.service_requests to authenticated;
grant update(company_id,assigned_to,status,priority,source,application_reference,external_reference,
  government_fee,other_cost,service_fee,discount,expected_completion_at,notes,archived_at)
  on public.service_requests to authenticated;
grant delete on public.service_catalog_requirements to authenticated;
grant select on public.service_request_requirements to authenticated;
grant update(status,document_id) on public.service_request_requirements to authenticated;
grant select on public.service_payments to authenticated;
grant insert(organization_id,service_request_id,amount,method,reference,paid_at,notes) on public.service_payments to authenticated;

-- Extend the existing tenant-scoped customer activity RPC with service events.
create or replace function public.customer_activity_timeline(target_organization_id uuid,target_customer_id uuid,result_limit integer default 10)
returns table(id uuid,entity_type text,message text,created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select activity.id,activity.entity_type,activity.message,activity.created_at from public.activity_logs activity
  where activity.organization_id = target_organization_id and (
    (activity.entity_type = 'customer' and activity.entity_id = target_customer_id)
    or (activity.entity_type = 'document' and exists(select 1 from public.documents d where d.organization_id = target_organization_id and d.id = activity.entity_id and d.customer_id = target_customer_id))
    or (activity.entity_type = 'follow_up' and exists(select 1 from public.follow_ups f where f.organization_id = target_organization_id and f.id = activity.entity_id and f.customer_id = target_customer_id))
    or (activity.entity_type = 'service_request' and exists(select 1 from public.service_requests r where r.organization_id = target_organization_id and r.id = activity.entity_id and r.customer_id = target_customer_id))
  ) order by activity.created_at desc limit least(greatest(result_limit,1),50);
$$;
revoke all on function public.customer_activity_timeline(uuid,uuid,integer) from public,anon;
grant execute on function public.customer_activity_timeline(uuid,uuid,integer) to authenticated;
