# Local Demo Data

`supabase/seed.sql` contains an idempotent, fictional visual-QA dataset for the local Al Noor Typing Centre seed organisation. It is applied only by `npm run db:reset` against the local Docker-backed Supabase stack.

The expanded batch adds seven companies, fourteen customers, thirty-six documents, four renewals, six same-day follow-ups, and twelve activity events. Dates are calculated from `current_date` or `now()` so expiry and follow-up dashboard states remain useful.

All added records are marked by `DEMO-AN-` document/licence numbers, `@demo.renewtrack.invalid` emails, or fixed QA UUID ranges. To remove only the expanded batch locally, run the statements in `supabase/seeds/reset-demo.sql` in the local Supabase SQL editor. `npm run db:reset` is the clean full local reset.

Never run either file against the hosted project. The hosted migration ledger is pending repair, and a repository seed must not modify a live tenant.
