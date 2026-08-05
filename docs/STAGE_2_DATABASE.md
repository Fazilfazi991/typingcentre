# Stage 2 Database Design

## Naming and tenancy

TypeScript retains camelCase `organizationId`; PostgreSQL uses snake_case `organization_id`. Every tenant-owned table has `organization_id`, an index suited to its access pattern, and composite foreign keys where it relates to another tenant-owned record. This prevents a document in one organisation from referencing a customer, branch, company, or document type from another organisation.

## Tables

| Area | Tables |
| --- | --- |
| Tenant identity | `organizations`, `organization_memberships` |
| Billing foundation | `organization_subscriptions` |
| CRM | `branches`, `companies`, `customers` |
| Expiry records | `organization_document_types`, `documents` |
| Workflows | `renewals`, `follow_ups`, `notifications` |
| Accountability | `activity_logs`, `audit_logs` |

`organization_memberships` references `auth.users` for a later authentication stage but does not create users, sessions, policies, roles UI, or staff records. The only current member roles are owner and admin; the MVP retains one owner account per organisation.

Document object metadata, R2 object keys, presigned URLs, and upload records are intentionally deferred to Stage 6.

## Status ownership

`documents.status` is a queryable presentation/status field prepared for dashboard performance. The authoritative expiry date remains `expires_on`; Stage 7 will centralize status recomputation and expiry dashboard queries. Renewal workflow state is stored separately in `renewals`.

## Verification

`supabase/tests/001_initial_schema.sql` is a pgTAP suite for tables, constraints, indexes, triggers, and development seed records. It requires a local Docker-backed Supabase stack and is not run against a hosted project during Stage 2.
