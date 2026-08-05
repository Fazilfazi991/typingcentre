-- Stage 5 correction: an UPDATE also requires a matching SELECT policy in PostgREST.
-- Owners may inspect archived records, while member-facing queries remain active-only.
create policy companies_select_archived_owner on public.companies for select to authenticated
  using (archived_at is not null and (select security.is_organization_owner(organization_id)));

create policy branches_select_archived_owner on public.branches for select to authenticated
  using (archived_at is not null and (select security.is_organization_owner(organization_id)));

create policy customers_select_archived_owner on public.customers for select to authenticated
  using (archived_at is not null and (select security.is_organization_owner(organization_id)));
