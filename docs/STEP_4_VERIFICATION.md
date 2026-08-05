# Stage 4 Verification

## Baseline

The live schema was created by the Stage 2/3 SQL Editor deployment and inspected with catalog queries. The sanitized query snapshot and audit are committed. The remote CLI ledger is still empty; repair is pending authorised CLI access and `db push` remains prohibited.

## RLS migration

`20260805170848_stage_4_row_level_security.sql` is the only new Stage 4 migration. It covers all fifteen current application tables, creates four non-exposed helper functions, restricts grants, installs explicit policies, and gives platform admins metadata rather than blanket tenant-business access.

The migration was applied through a reviewed SQL Editor transaction while the ledger remains unresolved. A clean catalog query confirmed RLS on all 15 public tables; policy counts are `0` for intentionally unreadable `audit_logs`, `2` for `organizations` and `notifications`, and `1` elsewhere. Supabase Advisor reports no security or performance issues. Use the fictional two-tenant transaction plan in `RLS_TESTING.md` before enabling production CRM queries.

## Application verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Browser Auth QA and live two-tenant SQL tests require fictional accounts or transactional claim simulation and are not substituted with real user credentials.

## Deferred work

Cloudflare R2, uploads, reminders, email, WhatsApp, payments, CRM/document production CRUD, staff management, OCR, and native applications remain out of scope.
