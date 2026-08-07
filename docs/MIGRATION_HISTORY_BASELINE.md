# Migration History Baseline

## Why the ledger differs

The Stage 2 and Stage 3 files were applied in Supabase SQL Editor. SQL Editor executes schema changes but does not add CLI migration ledger entries.

## Chosen approach

Use migration repair only after an authorised Supabase CLI session is available and the live-equivalence audit has been reviewed. The exact intended commands are:

```powershell
npx supabase link --project-ref swnuikslynuneucetjub
npx supabase migration repair --status applied 20260805162339
npx supabase migration repair --status applied 20260805164117
npx supabase migration repair --status applied 20260805170848
npx supabase migration repair --status applied 20260805172049
npx supabase migration repair --status applied 20260805215000
npx supabase migration list
```

Do not run `db push` before the final command shows every Stage 2-5 version as applied. The Stage 4 and Stage 5 migrations were manually applied and catalog-verified on 2026-08-05, but still need this ledger repair. Never mark a partially applied migration as applied.

## Current status

No repair ran in this stage because the CLI account lacks project Management API permission. This is intentionally not represented as a completed baseline.

## Pending manual migrations

`20260806195000_stage_5_follow_up_workflow_extension.sql` was manually applied through the Supabase SQL Editor. Include version `20260806195000` in the future ledger-repair review only after the live-equivalence audit is recorded; do not use `db push` while the ledger remains unresolved.

`20260807015826_stage_6_private_document_storage_foundation.sql` is prepared for manual Supabase SQL Editor application. Do not run it through `db push`, `db reset`, or CLI migration-up while the ledger is unresolved. Its application is the Phase 6A owner checkpoint; record verification before adding it to a future ledger-repair review.

## Future rules

Create migrations with `supabase migration new`, review them, apply them through the linked CLI workflow, and verify `migration list`. Do not use SQL Editor as the only source of a production schema change.
