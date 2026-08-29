# Public Demo

`/demo` is the only public demo entry point. It signs a logged-out visitor into a dedicated Supabase Auth user on the server, establishes the normal SSR session cookies, and redirects to the real `/dashboard` workspace.

Required production-only environment variables:

- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `DEMO_ORGANIZATION_SLUG=note-it-demo`

The credentials must never use `NEXT_PUBLIC_` names. Existing deployments may continue to supply the equivalent server-only `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` names during migration. The demo user must have one active membership in the isolated `Note It Demo Typing Centre` tenant and no platform-admin role. Existing authenticated users are sent to their own dashboard; `/demo` never replaces their session.

The legacy LocalStorage/iframe prototype has been removed. Demo data now uses the application's normal tenant-scoped tables and RLS policies. Public file uploads and Gemini extraction remain disabled to prevent visitors from sharing sensitive documents into a shared workspace or consuming unbounded extraction/storage resources. Outbound WhatsApp/email jobs skip the configured demo tenant, and settings actions block outbound messaging changes for the demo user.
