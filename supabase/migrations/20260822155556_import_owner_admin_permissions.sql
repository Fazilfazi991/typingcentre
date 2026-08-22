-- Narrow import capability: active owner/admin membership in the target tenant.
create or replace function security.can_manage_imports(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    join public.organization_subscriptions subscription on subscription.organization_id = organization.id
    where membership.organization_id = target_organization_id and membership.user_id = (select auth.uid())
      and membership.role in ('owner','admin') and membership.status = 'active'
      and organization.status = 'active' and organization.is_active
      and subscription.status in ('trial','active','past_due')
  );
$$;
revoke all on function security.can_manage_imports(uuid) from public;
grant execute on function security.can_manage_imports(uuid) to authenticated;

drop policy if exists import_jobs_manage_owner on public.import_jobs;
create policy import_jobs_manage_owner_admin on public.import_jobs for all to authenticated
  using ((select security.can_manage_imports(organization_id)))
  with check ((select security.can_manage_imports(organization_id)) and created_by = (select auth.uid()));
drop policy if exists import_job_rows_manage_owner on public.import_job_rows;
create policy import_job_rows_manage_owner_admin on public.import_job_rows for all to authenticated
  using ((select security.can_manage_imports(organization_id))) with check ((select security.can_manage_imports(organization_id)));

-- Import execution needs only these canonical writes; existing owner policies remain intact.
create policy import_customers_write_owner_admin on public.customers for all to authenticated
  using ((select security.can_manage_imports(organization_id))) with check ((select security.can_manage_imports(organization_id)));
create policy import_companies_write_owner_admin on public.companies for all to authenticated
  using ((select security.can_manage_imports(organization_id))) with check ((select security.can_manage_imports(organization_id)));
create policy import_documents_write_owner_admin on public.documents for all to authenticated
  using ((select security.can_manage_imports(organization_id))) with check ((select security.can_manage_imports(organization_id)));
create policy import_document_types_write_owner_admin on public.organization_document_types for all to authenticated
  using ((select security.can_manage_imports(organization_id))) with check ((select security.can_manage_imports(organization_id)));
