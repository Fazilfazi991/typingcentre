# Environment Setup

Copy `.env.example` to a non-committed local environment file when a later stage needs services. Demo mode needs none of these values.

| Variable                                                                                         | Visibility  | Needed now                | Purpose                              |
| ------------------------------------------------------------------------------------------------ | ----------- | ------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                                                                            | Public      | No                        | Canonical application URL            |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                     | Public      | No                        | Future browser Supabase client       |
| `SUPABASE_SERVICE_ROLE_KEY`                                                                      | Server-only | No                        | Restricted administrative tasks only |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`     | Server-only | Stage 6 manual checkpoint | Private R2 document storage          |
| `R2_PRESIGNED_UPLOAD_TTL_SECONDS`, `R2_PRESIGNED_DOWNLOAD_TTL_SECONDS`, `R2_MAX_FILE_SIZE_BYTES` | Server-only | Stage 6 manual checkpoint | R2 signing and upload limits         |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                                            | Server-only | No                        | Daily expiry digest via Resend       |
| `CRON_SECRET`                                                                                    | Server-only | No                        | Protect scheduled endpoints          |
| `SENTRY_DSN`                                                                                     | Server-only | No                        | Server observability                 |
| `NEXT_PUBLIC_SENTRY_DSN`                                                                         | Public      | No                        | Browser observability                |

`getServerEnv` cannot run in a browser module. Production-required values will become strict only in the stage that activates their service.

R2 values must never use `NEXT_PUBLIC_`, be committed, logged, or entered into browser code. See `STAGE_6_R2_SETUP.md` for the required private bucket and CORS configuration.
