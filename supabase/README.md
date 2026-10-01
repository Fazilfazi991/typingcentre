# Note It Supabase Foundation

## Canonical Typing Centre CRM project

The only hosted Supabase target for this CRM is **`ycyiserusoilhrpmszzp`**
(`https://ycyiserusoilhrpmszzp.supabase.co`). The `project_id` in `config.toml`
names the local development stack; it does not link the CLI to a hosted project.
Before every remote migration, check `supabase/.temp/project-ref` and require it
to equal `ycyiserusoilhrpmszzp`. Never push these migrations to an older project.

The repository migration baseline is the complete ordered `supabase/migrations`
directory on `codex/typing-centre-service-requests`, including the September
operational migrations and the October service request migrations. The new
project was empty on 2026-10-01; all 39 migrations were then applied in order
and confirmed in its remote ledger. Check the ledger and linked ref before any
future push. Do not apply `seed.sql` to the hosted project: it is local QA data.

Use `.env.example` as the variable inventory. The browser needs
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from this
project. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a fallback only. Server
operations that genuinely need admin access use `SUPABASE_SERVICE_ROLE_KEY`;
R2, AI, email, WhatsApp, and cron settings are also server only. Keep all
secrets in ignored local environment files or deployment secret settings.
Document files remain in R2; this Supabase project owns their metadata.

Auth on the new project has email/password and signup enabled with email
confirmation. For local development, the Site URL is `http://localhost:3000`
and the allowed redirect is `http://localhost:3000/auth/callback**` (verified
in the dashboard on 2026-10-01). Add an exact demo preview callback URL when a
preview host is chosen. The project started with no Auth users, Storage
buckets, or Edge Functions. No WhatsApp cron Vault secret was present, so the
historical scheduler migrations will not activate delivery during baseline;
the final CRM migration also unschedules that dispatcher explicitly.

A confirmed fictional Auth user, `demo.owner@example.invalid`, was created in
the target project. `seeds/bootstrap-new-typing-centre-demo.sql` was run once
through the linked CLI to create the demo workspace. Its guards reject a
preexisting workspace and it invokes the scoped demo reset to fill customers,
companies, documents, follow-ups, services, requests, payments, and activity.
The local demo password is in ignored `.env.local` and `.env.demo.local` files.
Keep it only in server-side ignored or deployment environment settings.

To inspect or update the hosted project, use the dedicated CLI profile and
check `supabase/.temp/project-ref` first:

```powershell
node node_modules/supabase/dist/supabase.js migration list --linked --profile typing-centre-demo
node node_modules/supabase/dist/supabase.js db advisors --linked --type security --profile typing-centre-demo
node node_modules/supabase/dist/supabase.js gen types --linked --schema public --profile typing-centre-demo
```

The 2026-10-01 security advisor found no missing RLS warnings. A follow-up
migration revoked direct API access to legacy trigger handlers and anonymous
access to legacy definer RPCs. Seven signed-in definer RPC warnings remain for
the document and onboarding operations intentionally exposed to authenticated
users. The performance advisor reports 18 legacy multiple-permissive-policy
warnings; these should be reviewed before broader deployment. The transactional
`verification/tenant_isolation.sql` probe passed on the new project, including
the full service request status path, and left no test tenants. The WhatsApp
dispatch cron job is unscheduled. The rollback-only
`verification/workspace_operations.sql` probe also passed for company, branch,
customer, document metadata, renewal, and follow-up writes.

## Manual local verification

1. Install Docker Desktop and start it.
2. Run `npm run db:start`.
3. Run `npm run db:reset` to apply migrations and `seed.sql`.
   This includes the fictional local dashboard QA batch documented in `docs/LOCAL_DEMO_DATA.md`.
4. Run `npm run db:test` for the pgTAP schema checks.
5. Run `npm run db:types:local` to replace `src/types/database.generated.ts` with database-generated types.
6. Run `npm run db:stop` when finished.

## Older hosted project warning

The former hosted project received early SQL Editor changes without matching
CLI ledger entries. That warning applies to the **old** project. Do not point
this repository at it or use it to baseline the new CRM database.

## Hosted demo data

`seed.sql` is local only. The new hosted demo uses the guarded bootstrap script
above after an Auth user exists. The older Al Noor hosted QA instructions are
historical and are not a setup path for this project.
