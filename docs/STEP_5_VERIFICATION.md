# Stage 5 Verification

## Passed

- Remote Stage 5 catalog check: CRM tables have RLS and three policies each; expected functions and active-record indexes exist.
- Fictional Auth users, profile provisioning, organisations, memberships, subscriptions and usage counters.
- Live two-tenant select, update, insert and relationship-isolation tests.
- Own-tenant company, branch, customer and follow-up CRUD primitives, including archive and follow-up completion.
- Passport and Emirates ID list masking helpers.
- Unit validation coverage for CRM schemas, safe list parsing, masking and database error mapping.
- Batch 5A implementation checks: company detail branch list now filters archived branches, company archive revalidates dashboard/list/detail, and production QA can use `npm run start`.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` passed after the Batch 5A verification fixes.
- Stage 5 Batch 5A browser verification passed and is signed off: Amina company/branch CRUD/archive, Daniel company/branch smoke, symmetric direct URL isolation, logout/back-navigation, responsive QA, accessibility QA, console inspection and archive retention checks.

## Corrective migration

`20260805215000_stage_5_archive_policy_correction.sql` was applied manually in the Supabase SQL Editor. It adds owner-only archived-record SELECT policies. This is required because PostgREST needs a matching SELECT policy when an update changes an active record into an archived one. Normal routes continue to query `archived_at is null`.

## Blocked or not tested

- Batch 5B remains not started.
- Generated remote database types: blocked by project API permission. The local placeholder remains in use.
- Migration ledger: unresolved. Do not run `supabase db push`. Once remote history is reconciled, mark every manually applied Stage 2-5 migration as applied only after confirming remote equivalence.
- Platform-admin boundary: not tested because no authorised platform-admin test identity exists.

## Deferred

R2, uploads, reminders, billing, payments, Staff, OCR and mobile work remain out of scope for Stage 5.

Batch 5B has not started.

Stage 6 has not started.
