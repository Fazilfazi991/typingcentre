# Hosted QA Demo Data

The Vercel deployment reads from hosted Supabase. `supabase/seed.sql` is for a local Supabase database only, so it does not populate the deployed application.

For the isolated `Note It Demo Typing Centre` tenant, run [hosted-note-it-demo.sql](../supabase/seeds/hosted-note-it-demo.sql) in the Supabase SQL Editor, then refresh the deployed dashboard. The script targets the currently applied hosted schema, is idempotent, and creates clearly marked dashboard records with dynamic expiry dates.

The public demo uses a dedicated normal Supabase user attached only to this demo tenant. Configure `DEMO_EMAIL`, `DEMO_PASSWORD`, and `DEMO_ORGANIZATION_SLUG=note-it-demo` as server-only deployment variables. Existing deployments may temporarily retain the equivalent `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` names. Do not put these values in `NEXT_PUBLIC_*`, browser storage, URLs, or source control. The seed provides 15 fictional customers, seven fictional companies, 36 documents spanning expired/today/near-term/long-term expiry states, and due-today/upcoming/completed follow-ups.

Safety boundaries:

- It aborts unless the `note-it-demo` organisation and exactly one active primary owner membership exist.
- It does not create or modify Auth users, memberships, subscriptions, RLS policies, or records from another organisation.
- It uses only `QA-DEMO-` and `@demo.renewtrack.invalid` fixtures.
- It is intended solely for the fictional QA tenant, never a customer tenant.

Visitor-created records remain tenant-scoped and cannot affect any other tenant. If periodic reset automation is added later, it must target the dedicated slug and preserve RLS and private-storage boundaries.
