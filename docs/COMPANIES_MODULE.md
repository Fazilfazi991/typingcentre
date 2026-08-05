# Companies Module

Routes: `/companies`, `/companies/new`, and `/companies/[companyId]`. Owners can create, list, search, view and archive companies; branch creation is company-scoped. Lists retain safe pagination and sort allowlists, filter `archived_at is null`, and are protected by server workspace context plus RLS.
