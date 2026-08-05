# Environment Setup

Copy `.env.example` to a non-committed local environment file when a later stage needs services. Demo mode needs none of these values.

| Variable | Visibility | Needed now | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | No | Canonical application URL |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | No | Future browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | No | Restricted administrative tasks only |
| `CLOUDFLARE_R2_*` | Server-only | No | Future private document storage |
| `RESEND_API_KEY`, `EMAIL_FROM` | Server-only | No | Future reminder email |
| `CRON_SECRET` | Server-only | No | Protect scheduled endpoints |
| `SENTRY_DSN` | Server-only | No | Server observability |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | No | Browser observability |

`getServerEnv` cannot run in a browser module. Production-required values will become strict only in the stage that activates their service.
