# Step 1 Verification

## Commands and results

- `npm install` completed the required dependency tree and lockfile.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed: 3 date utility tests.
- `npm run build` passed: Next.js production compilation and static generation succeeded.
- Local smoke request to the Next.js development shell on port `3100` returned HTTP 200 and RenewTrack content.
- Live browser smoke check confirmed the `/legacy-prototype/index.html` frame is visible from the Next.js home page.

## Scope

This stage adds the Next.js/TypeScript production foundation while serving the preserved demo prototype. No Supabase project, tables, migrations, RLS, authentication, R2 upload, scheduled reminder, email or subscription capability is implemented.

## Manual smoke-test checklist

- Demo sign-in and tenant-specific dashboards
- Sidebar and mobile navigation
- Search and modal rendering
- Dashboard action menus
- No Staff module

## Problems found and fixed

- The initial lint configuration used an incompatible legacy Next configuration export. It was replaced with the flat Next Core Web Vitals configuration and TypeScript parser.
- The original prototype is intentionally served in a frame during this stage; migration of individual screens is deferred to later product stages.

## Files changed

- Tooling: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.prettierrc.json`, `.gitignore`, `.env.example`.
- App foundation: `src/app/*`, `src/components/legacy/prototype-frame.tsx`, `src/types/domain.ts`, `src/lib/config/*`, `src/lib/demo/*`, `src/lib/dates/expiry.ts`, `src/lib/validation/schemas.ts`, and `tests/expiry.test.ts`.
- Preserved demo: `legacy-prototype/index.html` and `public/legacy-prototype/index.html`.
- Documentation: `README.md` and the six files in `docs/`.
