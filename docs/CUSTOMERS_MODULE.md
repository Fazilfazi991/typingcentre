# Customers Module

Routes: `/customers`, `/customers/new`, `/customers/[customerId]`, and `/customers/[customerId]/edit`. Customer lists mask passport and Emirates ID values and never place full values in URLs. Detail access is tenant-scoped by RLS. A branch requires a selected company, with server-side validation confirming both records are active and in the current tenant. Archive is soft-only through `archived_at`; archived records remain owner-readable but are excluded from active lists.
