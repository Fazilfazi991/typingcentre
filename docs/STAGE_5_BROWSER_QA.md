# Stage 5 Browser QA

Environment: local development server on port 3000, in-app browser, 2026-08-05. `.env.local` was present and gitignored; no values, credentials, tokens, or sensitive customer values were recorded.

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

## Not completed

- Batch 5A protected browser CRUD is blocked. The local QA user IDs and passwords are present, but the available non-secret account emails were rejected by production Auth with the safe login error. The exact QA account email identifiers must be provided through secure local storage before browser CRUD can continue.
- Amina company create/view/edit/archive, Amina branch create/edit/archive, Daniel company/branch smoke, direct cross-tenant URLs, logout/back-navigation, responsive breakpoints, keyboard/accessibility sweep, and full console/network sweep remain blocked by the login identifier issue.
- The app resolves Account A's Business subscription correctly in the database; the current blocked browser pass could not reconfirm the rendered plan text.

These unchecked flows keep Stage 5 browser sign-off incomplete.
