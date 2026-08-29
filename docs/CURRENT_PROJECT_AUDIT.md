# Current Project Audit

## Observed stack

- Before this stage: one static `index.html` prototype with inline CSS and vanilla browser JavaScript.
- Routing: hash-based page switching inside the browser.
- Data: generated demo tenant records persisted in `localStorage`.
- No package manager, TypeScript, backend, environment configuration, test suite, build step, or production authentication existed.
- Git branch: `main`; remote: GitHub `Fazilfazi991/typingcentre`.

## Current pages and flows

The prototype includes demo sign-in, dashboard, customers, companies, documents, renewals, calendar, follow-ups, notifications, reports, settings and a platform-admin demo view. It has desktop sidebar and mobile navigation behavior.

Demo accounts are Platform Admin (`admin@renewtrack.ae`), Al Noor (`owner@alnoortyping.ae`), Smart Documents (`admin@smartdocs.ae`), and Emirates Business Hub (`manager@emirateshub.ae`); all credentials remain prototype-only.

## Demo-only implementation

- LocalStorage keys: `renewtrack-session` and `renewtrack-store`.
- Tenant records use `organization_id` in the legacy prototype and are filtered in browser code.
- The platform demo can preview tenants. This is visual demo behavior, not authorisation.

## Technical debt and security concerns

- Inline markup, CSS and large generated datasets are coupled in one file.
- Demo passwords and LocalStorage session data are browser-visible by design.
- No server validation, database isolation, audit log, upload controls, real authentication, error boundary, tests or production access controls existed.
- Browser-side tenant filtering must never be treated as production security.

## Migration approach

The original browser-local prototype was used during the staged migration and has now been removed. The canonical demo is the real App Router application backed by Supabase Auth, tenant membership, and RLS-protected data.

## Retain now / rewrite later

Retain the visual language, dashboard hierarchy, tenant demo identity and responsive behavior. Rewrite the inline state management, demo authentication, local date formatting, hash router and hand-built UI markup into typed Next.js components over subsequent stages.
