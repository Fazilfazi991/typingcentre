# RenewTrack Supabase Foundation

This directory is intentionally local-only in Stage 2. It contains no project reference, access token, credentials, or cloud link.

## Manual local verification

1. Install Docker Desktop and start it.
2. Run `npm run db:start`.
3. Run `npm run db:reset` to apply migrations and `seed.sql`.
   This includes the fictional local dashboard QA batch documented in `docs/LOCAL_DEMO_DATA.md`.
4. Run `npm run db:test` for the pgTAP schema checks.
5. Run `npm run db:types:local` to replace `src/types/database.generated.ts` with database-generated types.
6. Run `npm run db:stop` when finished.

## Manual hosted setup, later

The project owner should create a Supabase project manually. Do not link the repository until a later implementation stage explicitly calls for it. Before linking, review migrations, enable the intended Data API exposure settings, and implement RLS policies in Stage 4. Never place a service-role key in `NEXT_PUBLIC_*` variables.

## Stage 4 live-state warning

Stage 2, Stage 3, and Stage 4 SQL were manually applied through the hosted SQL Editor. Their schema effects are live, but their versions are not yet recorded in the remote CLI migration ledger. Do not run `db push`, `db reset`, or remote `migration up` until the documented repair has been completed.

## Stage boundaries

- This migration creates schema integrity only.
- It does not create user accounts or implement authentication flows.
- Stage 4 enables RLS and creates tenant-isolation policies for the current tables.
- It does not create Storage buckets or R2 upload flows.
## Hosted QA data

`seed.sql` is local-only. For the deployed fictional Al Noor QA tenant, follow [Hosted QA Demo Data](../docs/HOSTED_QA_DEMO_DATA.md) and run its guarded SQL Editor script manually.
