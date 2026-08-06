-- Batch 5C approved workflow extension. Apply manually in Supabase SQL Editor
-- while the migration ledger remains unresolved; do not run supabase db push.
alter table public.follow_ups
  alter column customer_id drop not null,
  add column company_id uuid,
  add column customer_response text,
  add column next_follow_up_id uuid,
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.follow_ups
  add constraint follow_ups_company_tenant_fk
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete restrict,
  add constraint follow_ups_next_tenant_fk
    foreign key (organization_id, next_follow_up_id)
    references public.follow_ups (organization_id, id)
    on delete set null,
  add constraint follow_ups_relationship_required
    check (customer_id is not null or company_id is not null),
  add constraint follow_ups_next_not_self
    check (next_follow_up_id is null or next_follow_up_id <> id);

create index follow_ups_organization_company_due_idx
  on public.follow_ups (organization_id, company_id, due_at)
  where status in ('pending', 'overdue');

grant insert (organization_id, customer_id, company_id, document_id, due_at, status, completed_at, note, customer_response, next_follow_up_id, created_by)
  on public.follow_ups to authenticated;
grant update (customer_id, company_id, due_at, status, completed_at, note, customer_response, next_follow_up_id)
  on public.follow_ups to authenticated;
