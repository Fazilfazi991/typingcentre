# Safe Demo Import

Starting release: `ca673f1d58cff7459d6d2039e629e57367558036` on `codex/typing-centre-demo-polish`.

## Presentation

Open `/demo`, then **Import Data** in the sidebar or mobile More.
Choose **Try Sample Import**, then **Validate & Review**.
The untouched demo produces **8 Ready, 1 Duplicate, 1 Needs Review** from ten CSV rows.
Choose **Skip duplicate & row needing review**, then **Import Sample Data**.
The verified run creates **7 customers, 1 company, 8 documents**, updates **0**, skips **2**, and fails **0**.
These numbers come from the actual import job; the UI does not hardcode results.
Open Customers, Documents, or Import Details from the results.
Use **Reset Demo & Try Again**, review the whole-workspace reset explanation, and confirm.

## Safety and pipeline

- Normal owner/admin CSV/XLSX import behavior remains available in private workspaces; normal members remain blocked.
- Demo Mode has no file picker or row editor. Normal upload/mutation endpoints continue to deny demo requests.
- The dedicated demo endpoint accepts only a named action. It accepts no file, organization, row values, mapping, or job ID.
- An active, server-derived membership and the configured demo ID/slug are required. `DEMO_ORGANIZATION_ID` must be configured; production already has the canonical demo ID.
- The server generates `note-it-demo-import.csv`. Its download is provided by the application at `/api/imports/demo/sample`.
- Existing CSV parsing, staging, validation, duplicate resolution, execution, and import history are shared with the private importer.
- The sample includes Amina Rahman, John Mathew, Maria Santos, Sunrise Technical Services LLC, four document types, company links and future expiries. Ahmed matches the seeded Emirates ID/phone; Tariq's ambiguous date demonstrates validation.
- Every email uses `.invalid`; all rows are explicitly fictional. Sample nationality descriptions remain in notes, matching the current import fields.
- Fixed job/row IDs, canonical-value checks, an atomic execution claim, and server-owned execution values constrain repetition and input tampering.
- Completed results reopen without starting another import. Reset uses the existing guarded reset RPC, including its existing storage cleanup, and restores the entire fictional workspace.
- Successful reset reloads the import entry page to clear client route caches throughout the workspace. Returning through navigation therefore shows the fresh sample screen.
- No schema, migration, RLS, Supabase project, or production deployment changes are required.
- Import Details now reads its importer profile separately, correcting the previously invalid database relationship. Demo error reports are restricted to the validated fixed sample job.

## Changed files

- `src/components/workspace-shell.tsx`
- `src/app/imports/new/page.tsx`
- `src/app/imports/new/demo-import.tsx`
- `src/app/imports/new/demo-import.module.css`
- `src/app/settings/page.tsx`
- `src/app/settings/data-import/[jobId]/page.tsx`
- `src/app/api/imports/demo/route.ts`
- `src/app/api/imports/demo/sample/route.ts`
- `src/app/api/imports/parse/route.ts`
- `src/app/api/imports/[jobId]/validate/route.ts`
- `src/app/api/imports/[jobId]/resolve/route.ts`
- `src/app/api/imports/[jobId]/execute/route.ts`
- `src/app/api/imports/[jobId]/error-report/route.ts`
- `src/app/api/internal/demo-reset/route.ts`
- `src/lib/imports/demo-sample.ts`
- `src/lib/imports/demo-types.ts`
- `src/lib/imports/demo.ts`
- `src/lib/imports/stage.ts`
- `src/lib/imports/pipeline.ts`
- `src/lib/demo/reset.ts`
- `tests/demo-import.test.ts`
- `tests/demo-import-ui.test.tsx`
- `tests/import-history.test.tsx`
- `tests/workspace-shell-navigation.test.tsx`
- This release note.

## Verification and limits

The production build is tested locally against canonical Supabase `ycyiserusoilhrpmszzp`, using only the protected fictional workspace. Production deployment awaits explicit instruction.

The baseline is 244 passing tests, passing TypeScript, ESLint, and production build. The tests cover real pipeline behavior through a Data API adapter, navigation, page access, input tampering, organization restrictions, concurrency, record visibility, history, and reset.

Chrome QA passed on desktop and 390px mobile: demo navigation, preview, validation, skip resolution, execution, actual result counts, visible customers/company/documents, repeated result access, and Import Details. Review and results have no page-wide overflow. Live requests to normal demo mutation endpoints returned 403; an organization override returned 400; the deployed-app CSV download returned ten fictional rows.

Reset was exercised three times through the UI. The final state has 25 customers, 10 companies, 47 documents, zero import jobs/rows, and no document binaries. Sample customers and documents disappear from the lists; Ahmed returns to Passport Missing, with dashboard KPIs restored to 12 / 3 / 2 / 19. Returning through mobile More and the desktop sidebar shows the fresh sample action, without cached completed results.

The CSV sample is the supported demonstration format. A separate sample Excel download is not included. The normal Excel parser remains unchanged and covered by the existing tests.

A live private-tenant import has not been exercised because the canonical project currently contains only the protected demo workspace. Real Quick Scan remains outside this verification.
