# Stage 5 Verification

## Passed

- Remote Stage 5 catalog check: CRM tables have RLS and three policies each; expected functions and active-record indexes exist.
- Fictional Auth users, profile provisioning, organisations, memberships, subscriptions and usage counters.
- Live two-tenant select, update, insert and relationship-isolation tests.
- Own-tenant company, branch, customer and follow-up CRUD primitives, including archive and follow-up completion.
- Passport and Emirates ID list masking helpers.
- Unit validation coverage for CRM schemas, safe list parsing, masking and database error mapping.

## Corrective migration

`20260805215000_stage_5_archive_policy_correction.sql` was applied manually in the Supabase SQL Editor. It adds owner-only archived-record SELECT policies. This is required because PostgREST needs a matching SELECT policy when an update changes an active record into an archived one. Normal routes continue to query `archived_at is null`.

## Blocked or not tested

- Account A and Account B browser login/dashboard flows, plus symmetric direct cross-tenant company/customer URL checks: passed after local development-server recovery. Full browser QA remains incomplete; see `STAGE_5_BROWSER_QA.md`.
- Account A subscription is Business and Account B remains Starter, but the plan is not currently rendered in the workspace UI.
- Browser CRUD sign-off is blocked: the company list has no edit or archive controls. Branch/customer edit/archive controls, full follow-up editing/scheduling, responsive sweep, accessibility review and logout/back-navigation QA remain incomplete.
- Generated remote database types: blocked by project API permission. The local placeholder remains in use.
- Migration ledger: unresolved. Do not run `supabase db push`. Once remote history is reconciled, mark every manually applied Stage 2-5 migration as applied only after confirming remote equivalence.
- Platform-admin boundary: not tested because no authorised platform-admin test identity exists.

## Deferred

R2, uploads, reminders, billing, payments, Staff, OCR and mobile work remain out of scope for Stage 5.
