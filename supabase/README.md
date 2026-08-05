# RenewTrack Supabase Foundation

This directory is intentionally local-only in Stage 2. It contains no project reference, access token, credentials, or cloud link.

## Manual local verification

1. Install Docker Desktop and start it.
2. Run `npm run db:start`.
3. Run `npm run db:reset` to apply migrations and `seed.sql`.
4. Run `npm run db:test` for the pgTAP schema checks.
5. Run `npm run db:types:local` to replace `src/types/database.generated.ts` with database-generated types.
6. Run `npm run db:stop` when finished.

## Manual hosted setup, later

The project owner should create a Supabase project manually. Do not link the repository until a later implementation stage explicitly calls for it. Before linking, review migrations, enable the intended Data API exposure settings, and implement RLS policies in Stage 4. Never place a service-role key in `NEXT_PUBLIC_*` variables.

## Stage boundaries

- This migration creates schema integrity only.
- It does not create user accounts or implement authentication flows.
- It does not enable RLS or create policies.
- It does not create Storage buckets or R2 upload flows.
