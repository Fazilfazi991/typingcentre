# Hosted QA Demo Data

The Vercel deployment reads from hosted Supabase. `supabase/seed.sql` is for a local Supabase database only, so it does not populate the deployed application.

For the existing fictional Al Noor Typing Centre QA tenant, run [hosted-al-noor-demo.sql](../supabase/seeds/hosted-al-noor-demo.sql) manually in the Supabase SQL Editor, then refresh the deployed dashboard. The script targets the currently applied hosted schema, is idempotent, and creates clearly marked dashboard records with dynamic expiry dates.

Safety boundaries:

- It aborts unless the `al-noor-typing-centre` organisation and exactly one active primary owner membership exist.
- It does not create or modify Auth users, memberships, subscriptions, RLS policies, or records from another organisation.
- It uses only `QA-DEMO-` and `@demo.renewtrack.invalid` fixtures.
- It is intended solely for the fictional QA tenant, never a customer tenant.

To remove the hosted fixtures, run [hosted-al-noor-demo-reset.sql](../supabase/seeds/hosted-al-noor-demo-reset.sql) manually in the SQL Editor. It removes only marked fixture records; shared document types are retained.
