# Supabase Manual Setup

This guide intentionally does not require a project URL, keys, password, access token, or project reference during Stage 2.

## Local preparation

Install Docker Desktop and run the database commands defined in `package.json`. The Supabase CLI uses `supabase/config.toml`, applies ordered files in `supabase/migrations/`, then applies `supabase/seed.sql` on reset.

## When the owner creates a hosted project

1. Create the project in the owner-controlled Supabase account.
2. Review and apply the committed migrations using the owner-approved deployment workflow.
3. Do not expose tenant tables through the Data API until Stage 4 has enabled RLS and installed tested policies.
4. Add only the public URL and publishable/anon key to the application environment when Stage 3 begins.
5. Keep the service-role key server-only; it is never used by the browser clients in this repository.
6. Generate database types after migrations using `npm run db:types:linked` only after the owner intentionally links the local repository.

No remote project is created, linked, reset, pushed, or modified by this stage.
