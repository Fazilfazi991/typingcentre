# Production Architecture

RenewTrack will be a Next.js App Router SaaS hosted on Vercel. Supabase will provide Auth, PostgreSQL and RLS; Cloudflare R2 will hold private document objects; Resend will send reminders. Tenant-owned application types use `organizationId` and will map to PostgreSQL `organization_id` columns.

The planned request flow is browser -> Next.js server boundary -> Supabase/R2. Platform-admin views will be independently guarded, and demo mode remains explicitly separate from production mode.

## Planned upload flow

1. Browser requests an upload session.
2. Server validates user and organisation.
3. Server creates a short-lived presigned R2 URL.
4. Browser uploads directly to R2.
5. Server confirms object existence.
6. Supabase stores metadata.
7. Activity is logged.

Vercel must not proxy normal document file bodies.

## Stages

1. Foundation; 2. schema and migrations; 3. authentication and onboarding; 4. RLS; 5. CRM entities; 6. documents/R2; 7. expiry dashboard; 8. workflows; 9. reminders; 10. platform admin; 11. subscriptions; 12. reporting and QA.
