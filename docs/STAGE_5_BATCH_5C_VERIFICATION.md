# Stage 5 Batch 5C Verification

Status: blocked pending manual migration application and browser sign-off.

- Added tenant-scoped `/follow-ups` workspace with create, edit and complete flows.
- Added pending, completed and derived overdue state display.
- All follow-up mutations derive organisation context server-side and verify the related active customer belongs to that organisation.
- Focused typecheck, lint and Vitest checks passed.

Migration prepared: `20260806195000_stage_5_follow_up_workflow_extension.sql`. It is intentionally unapplied while the remote migration ledger remains unresolved. Until manual SQL Editor application is confirmed, company-only follow-ups, customer responses and next-follow-up scheduling are blocked.
