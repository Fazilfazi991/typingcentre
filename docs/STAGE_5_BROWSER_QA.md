# Stage 5 Browser QA

Environment: production QA server on port 3000, in-app browser, 2026-08-05 to 2026-08-06. `.env.local` was present and gitignored; no values, credentials, tokens or sensitive customer values were recorded.

## Passed

- Public login loaded. Invalid credentials produced the existing safe message; valid Account A credentials reached the tenant-scoped dashboard.
- Account A dashboard showed Al Noor Typing Centre and its own CRM totals. No Staff navigation item or demo content appeared.
- Cross-tenant direct company and customer URLs for Account A returned the neutral `Page not found` screen and did not reveal Smart Documents data.
- Account B signed into Smart Documents Services, did not display Al Noor content, and received the same neutral not-found response for an Account A company URL.
- Final credential-recovery browser pass: both existing owners signed in with their preserved Auth IDs. Account A reached the Al Noor dashboard; Account B reached Smart Documents Services and did not render Al Noor content. The browser console had no warnings or errors.
- Session cookie persisted through the login-to-dashboard navigation.
- The development server recovery and protected-route route compilation behavior are recorded in `LOCAL_SERVER_TROUBLESHOOTING.md`.
- Batch 5A production-server smoke: `npm run build` and `npm run start -- -p 3000` loaded `/login` with HTTP 200 and zero browser console errors.
- `.env.local` remains gitignored. The service-role key line was removed after the blocked QA attempt, and no admin client was used for browser QA.
- Batch 5A browser CRUD passed for Amina: company create/view/edit, branch create/edit, branch archive, company-list archive and company-detail archive.
- Batch 5A Daniel smoke passed: Smart Documents Services / Starter workspace, company create/view/edit, branch create/edit/archive, and no Al Noor data.
- Symmetric direct cross-tenant company detail/edit and branch edit URLs returned neutral not-found responses with no tenant names or raw RLS/SQL details.
- Logout and browser-back protection passed after unauthenticated workspace routes were corrected to redirect to `/login`.
- Responsive QA passed at 1440x900, 1280x800, 1024x768, 768x1024, 390x844 and 360x800.
- Accessibility QA passed for archive controls, dialog semantics, Escape close, labelled forms, required fields and visible focus.
- Archived company detail remained retained and read-only to the owning tenant; archived companies and branches remained excluded from active lists.

## Not completed

- Archived-business list UI is not present in Batch 5A, so archived records are verified through read-only owner detail reachability and active-list exclusion.
- Full Stage 5 sign-off remains pending later batches.

Batch 5A browser sign-off is complete.
