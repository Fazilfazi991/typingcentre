# Companies Module

Routes: `/companies`, `/companies/new`, `/companies/[companyId]`, and `/companies/[companyId]/edit`.

Owners can create, list, search, view, edit and archive companies. Company lists retain safe pagination and sort allowlists, filter `archived_at is null`, and are protected by server workspace context plus RLS.

Archive is soft-delete only. It sets `archived_at`, marks the company inactive/removed, revalidates `/dashboard`, `/companies`, and the company detail route, then returns to `/companies`. Archived companies remain retained and are excluded from active lists. If an archived detail route is still reachable by its owner, the route renders read-only actions.

Batch 5A browser sign-off passed for company create, view, edit, list archive, detail archive, active-list exclusion and read-only archived detail retention.
