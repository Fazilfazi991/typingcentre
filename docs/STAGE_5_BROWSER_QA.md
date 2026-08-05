# Stage 5 Browser QA

Environment: local development server on port 3000, in-app browser, 2026-08-05. `.env.local` was present and gitignored; no values, credentials, tokens, or sensitive customer values were recorded.

## Passed

- Public login loaded. Invalid credentials produced the existing safe message; valid Account A credentials reached the tenant-scoped dashboard.
- Account A dashboard showed Al Noor Typing Centre and its own CRM totals. No Staff navigation item or demo content appeared.
- Cross-tenant direct company and customer URLs for Account A returned the neutral `Page not found` screen and did not reveal Smart Documents data.
- Account B signed into Smart Documents Services, did not display Al Noor content, and received the same neutral not-found response for an Account A company URL.
- Session cookie persisted through the login-to-dashboard navigation.
- The development server recovery and protected-route route compilation behavior are recorded in `LOCAL_SERVER_TROUBLESHOOTING.md`.

## Not completed

- Logout/back-navigation flow.
- Full create/edit/archive UI flows, responsive breakpoints, keyboard/accessibility sweep, console/network sweep, and platform-admin QA.
- The app resolves Account A's Business subscription correctly in the database; plan text is not currently rendered in the workspace UI.

These unchecked flows keep Stage 5 browser sign-off incomplete.
