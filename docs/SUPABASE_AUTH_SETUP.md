# Supabase Auth Setup

Project reference: `swnuikslynuneucetjub`.

When the owner is ready, configure Supabase Authentication with email/password, Site URL, and redirect URLs for `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, and `http://localhost:3000/reset-password`. Add matching production URLs later. Decide confirmation requirements, password rules, rate limits, templates, and SMTP in the dashboard. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

Create the first platform admin manually, then verify its `profiles.platform_role`; ordinary user metadata must never grant this role.
