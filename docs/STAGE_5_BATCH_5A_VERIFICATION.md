# Stage 5 Batch 5A Verification

Baseline commit: `63e66f2`

Verification resumed from: `e2e774d`

QA date: 2026-08-05 to 2026-08-06

QA server mode: Passed - production server via `npm run build` and `npm run start -- -p 3000`.

No QA emails, passwords, service-role keys, access tokens, refresh tokens or screenshots were committed or documented.

## Results

| Check | Status | Result |
| --- | --- | --- |
| Amina login | Passed | Existing fictional owner signed in manually and reached the protected workspace. |
| Amina organisation | Passed | Workspace showed Al Noor Typing Centre only. |
| Amina plan | Passed | Workspace showed Business. |
| Amina company create | Passed | Disposable company was created through `/companies/new`. Required-field validation kept an incomplete form on the route. |
| Amina company view | Passed | Created company detail displayed expected values and active status. |
| Amina company edit | Passed | Protected edit route populated existing values and saved updated fields. Refresh preserved the update. |
| Amina company archive from list | Passed | Reusable archive confirmation opened, archive completed, and the company disappeared from active lists. |
| Amina company archive from detail | Passed | Detail archive completed, redirected to `/companies?archived=1`, and browser back did not restore an editable active state. |
| Amina branch create | Passed | Branch was created beneath the correct parent company and appeared on company detail. |
| Amina branch edit | Passed | Protected branch edit route populated existing values and saved updates. |
| Amina branch archive | Passed | Reusable archive confirmation opened, archive completed, branch disappeared from active branches, and parent company remained active. |
| Daniel login | Passed | Existing fictional owner signed in manually and reached Smart Documents Services. |
| Daniel plan | Passed | Workspace showed Starter. |
| Daniel company/branch smoke | Passed | Daniel created/viewed/edited one company, created/edited one branch, and archived the branch. No Al Noor data appeared. |
| Direct cross-tenant company URLs | Passed | Amina and Daniel each received neutral not-found responses for the other tenant's company detail and edit URLs. |
| Direct cross-tenant branch URLs | Passed | Amina and Daniel each received neutral not-found responses for the other tenant's branch edit URL. |
| Random valid UUID | Passed | Neutral not-found; no tenant or raw database details. |
| Malformed UUID | Passed | Neutral not-found; no tenant or raw database details. |
| Logout and browser back | Passed | Logout reached `/login`; direct protected routes after logout redirect to `/login`; browser back did not restore usable protected content. |
| Responsive QA | Passed | 1440x900, 1280x800, 1024x768, 768x1024, 390x844 and 360x800 passed for companies list, company detail/edit, branch add/edit and archive controls. |
| Accessibility QA | Passed | Archive triggers have accessible names; confirmation uses dialog semantics, title and description; Escape close, close/cancel controls, visible focus, labelled form controls and required fields were verified. |
| Console/network inspection | Passed | Browser console showed no warnings or errors during checked flows; no hydration errors, repeated auth-refresh loop, raw RLS/SQL errors or credential output were observed. |
| Data retention after company archive | Passed | Archived company remained reachable to its owning tenant as a read-only detail page and was excluded from active lists. |
| Data retention after branch archive | Passed | Archived branches were removed from active branch lists while the parent company and historical relationship were retained. |
| `.env.local` ignored | Passed | `git check-ignore .env.local` returned ignored. |
| Service-role key absent | Passed | No service-role key was added or used for Batch 5A browser QA. |
| Temporary email variables cleared | Passed | `QA_ACCOUNT_A_EMAIL` and `QA_ACCOUNT_B_EMAIL` were not present in `.env.local` or the active PowerShell process during final checks. |
| Typecheck | Passed | `npm run typecheck` passed. |
| Lint | Passed | `npm run lint` passed. |
| Vitest | Passed | `npm test` passed: 4 files, 14 tests. |
| Production build | Passed | `npm run build` passed. |

## Defects Found And Fixed

| Defect | Status | Fix |
| --- | --- | --- |
| Archived branches could remain visible on company detail after the owner-only archived-record SELECT policy correction. | Fixed | Company detail branch query filters `archived_at is null`. |
| Company archive did not revalidate dashboard or the archived company detail route. | Fixed | Company archive revalidates `/dashboard`, `/companies`, and `/companies/[companyId]`. |
| Production QA could not use the documented `npm run start` fallback because no `start` script existed. | Fixed | Added `start: next start`. |
| Native `<dialog>` was not reliable in the browser QA environment. | Fixed | Reusable archive confirmation now uses a progressively usable disclosure/dialog pattern with accessible labels, title, description, Escape close and pending submit state. |
| Logged-out protected workspace routes redirected to `/account-inactive` instead of `/login`. | Fixed | Workspace context now redirects unauthenticated users to `/login` and reserves `/account-inactive` for signed-in users without a valid active workspace. |

## Remaining Limitations

| Item | Status | Notes |
| --- | --- | --- |
| Archived-business list UI | Not tested | No archived company list UI exists in Batch 5A. This is expected; active lists exclude archived records. |
| Full Stage 5 sign-off | Not tested | Batch 5A only. Batch 5B and Stage 6 were not started. |
| `deleted_at` field | Not applicable | The production schema uses `archived_at` for soft archive. |
| Platform-admin boundary | Not tested | Out of Batch 5A scope because no authorised platform-admin QA identity exists. |
| Generated remote database types | Blocked | Remains blocked by project API permission, as documented in Step 5. |
| Migration ledger reconciliation | Blocked | Do not run `supabase db push` until remote history is reconciled. |

## Files Changed

- `package.json`
- `src/app/companies/[companyId]/page.tsx`
- `src/components/archive-dialog.tsx`
- `src/features/crm/actions.ts`
- `src/lib/workspace/context.ts`
- `src/app/globals.css`
- `docs/STAGE_5_BATCH_5A_VERIFICATION.md`
- `docs/COMPANIES_MODULE.md`
- `docs/BRANCHES_MODULE.md`
- `docs/STAGE_5_BROWSER_QA.md`
- `docs/STAGE_5_TENANT_ISOLATION_TEST.md`
- `docs/STEP_5_VERIFICATION.md`
- `docs/LOCAL_SERVER_TROUBLESHOOTING.md`

## Sign-Off

Batch 5A is signed off.

Batch 5B was not started.

Stage 6 was not started.
