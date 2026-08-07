# Automated expiry email notifications

RenewTrack sends one tenant-scoped digest at 8:00 AM Dubai time (04:00 UTC) through Vercel Cron. It includes active, non-archived documents due today, in 1–7 days, or in 8–30 days. The recipient is the active primary owner from `organization_memberships`, using that owner's active `profiles.email`.

## Configure

Set these production environment variables in Vercel (and locally in `.env.local` when testing):

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only Resend API key. |
| `RESEND_FROM_EMAIL` | A Resend-verified sender, such as `RenewTrack <notifications@example.com>`. |
| `CRON_SECRET` | Long random value required by the cron and test route. |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL used by the email CTA. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access for the scheduled job. |

In Resend, add and verify the sender domain before setting `RESEND_FROM_EMAIL`. Do not use a production recipient while testing.

## Test one tenant safely

Choose an active tenant UUID and a verified developer/test email. This request never changes the tenant owner's address and does not create a daily notification log:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/internal/expiry-notifications" -Headers @{ Authorization = "Bearer $env:CRON_SECRET"; "Content-Type" = "application/json" } -Body '{"organizationId":"TENANT_UUID","recipientEmail":"developer@example.com"}'
```

Create records expiring today, +3 days, and +15 days to check all groups. Repeat the production `GET` route twice after using a test sender; the `notification_logs` unique key allows only one successful digest per tenant and Dubai calendar date. Failed provider attempts remain retryable.

## Production scheduler

`vercel.json` calls `GET /api/internal/expiry-notifications` at `0 4 * * *`, which is 8:00 AM Asia/Dubai year-round. In Vercel, set `CRON_SECRET`; Vercel Cron sends it as the bearer token. An external scheduler must send the same header. Do not deploy the schedule until Resend and the sender domain are verified.
