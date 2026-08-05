# Stage 5 Batch 5A Verification

Baseline commit: `63e66f2`

QA date: 2026-08-05

QA server mode: Passed - production server via `npm run build` and `npm run start -- -p 3000`.

## Results

| Check | Status | Result |
| --- | --- | --- |
| Amina login | Blocked | `.env.local` contains QA user ID and password variables, but the available non-secret account email from project docs was rejected by production Auth with the safe login error. No service-role lookup was used. |
| Amina organisation | Not tested | Browser login was blocked before reaching the workspace. |
| Amina plan | Not tested | Browser login was blocked before reaching the workspace. |
| Amina company create | Blocked | Requires successful Amina login. |
| Amina company view | Blocked | Requires successful Amina login. |
| Amina company edit | Blocked | Requires successful Amina login. |
| Amina company archive from list | Blocked | Requires successful Amina login. |
| Amina company archive from detail | Blocked | Requires successful Amina login. |
| Amina duplicate trade licence | Blocked | Requires successful Amina login. |
| Amina branch create | Blocked | Requires successful Amina login. |
| Amina branch edit | Blocked | Requires successful Amina login. |
| Amina branch archive | Blocked | Requires successful Amina login. |
| Amina duplicate branch code | Blocked | Requires successful Amina login. |
| Daniel login | Blocked | Not attempted after Amina identifier failure; avoid repeated credential attempts without verified account email. |
| Daniel company/branch smoke | Blocked | Requires successful Daniel login. |
| Direct cross-tenant company URLs | Blocked | Requires authenticated owner sessions. Earlier Stage 5 checks proved direct database isolation. |
| Direct cross-tenant branch URLs | Blocked | Requires authenticated owner sessions. Earlier Stage 5 checks proved direct database isolation. |
| Random valid UUID | Blocked | Requires authenticated owner session. |
| Malformed UUID | Blocked | Requires authenticated owner session. |
| Logout and browser back | Blocked | Requires authenticated owner session. |
| Responsive QA | Blocked | Core protected flows were blocked at login. |
| Accessibility QA | Blocked | Core protected flows were blocked at login. |
| Console/network inspection | Passed | Login page loaded with zero browser console errors. Failed login showed a safe user-facing message and no raw database/RLS error. |
| Data retention after company archive | Blocked | Browser archive flow did not run. |
| Data retention after branch archive | Blocked | Browser archive flow did not run. |
| `.env.local` ignored | Passed | `git check-ignore .env.local` returned ignored. |
| Service-role key absent after QA | Passed | `SUPABASE_SERVICE_ROLE_KEY` was removed from `.env.local` after no admin operation was needed. |
| Typecheck | Passed | `npm run typecheck` passed. |
| Lint | Passed | `npm run lint` passed. |
| Vitest | Passed | `npm test` passed: 4 files, 14 tests. |
| Production build | Passed | `npm run build` passed. |

## Defects Found

| Defect | Status | Fix |
| --- | --- | --- |
| Archived branches could remain visible on company detail after the owner-only archived-record SELECT policy correction. | Fixed | Company detail branch query now filters `archived_at is null`. |
| Company archive did not revalidate dashboard or the archived company detail route. | Fixed | Company archive now revalidates `/dashboard`, `/companies`, and `/companies/[companyId]`. |
| Production QA could not use the documented `npm run start` fallback because no `start` script existed. | Fixed | Added `start: next start`. |
| Batch 5A browser CRUD cannot run without verified production Auth email identifiers for the two fictional QA users. | Blocked | Owner needs to provide or locally store the exact account emails alongside the existing QA password variables. |

## Files Changed

- `package.json`
- `src/app/companies/[companyId]/page.tsx`
- `src/features/crm/actions.ts`
- `docs/STAGE_5_BATCH_5A_VERIFICATION.md`
- `docs/COMPANIES_MODULE.md`
- `docs/BRANCHES_MODULE.md`
- `docs/STAGE_5_BROWSER_QA.md`
- `docs/STAGE_5_TENANT_ISOLATION_TEST.md`
- `docs/STEP_5_VERIFICATION.md`
- `docs/LOCAL_SERVER_TROUBLESHOOTING.md`

## Sign-Off

Batch 5A is Blocked, not signed off.

Reason: core browser CRUD verification did not pass because the production Auth login could not be completed with the locally available account identifiers.

Batch 5B was not started.

Stage 6 was not started.
