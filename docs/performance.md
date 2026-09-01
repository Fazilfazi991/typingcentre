# Performance architecture

## Scope and targets

Note It is primarily used from Dubai. Normal interactions must acknowledge input immediately, server-backed routes should become usable in about one second where infrastructure permits, and long-running upload/extraction work must expose a bounded, truthful state. Production targets are LCP below 2.5 seconds, INP below 200 ms, and CLS below 0.1.

## Runtime topology

Verified on 2026-09-01:

```text
Dubai browser
  -> Vercel CDN edge (DXB/BOM observed)
  -> Next.js functions in icn1 (Seoul) after the next deployment
  -> Supabase Auth/Postgres in AWS ap-northeast-2 (Seoul)
  -> private Cloudflare R2 object storage
  -> Gemini generateContent API
  -> Next.js function
  -> Dubai browser
```

The current deployment reports `iad1`; `vercel.json` now pins future Node.js functions to `icn1`. The Supabase database hostname resolves inside AWS prefix `2406:da12::/36`, which AWS publishes as `ap-northeast-2`. Static assets remain globally served by Vercel's CDN.

Do not migrate production data as part of routine application changes. Prefer aligning the application runtime with the database first because it avoids a data migration. Validate UAE-to-candidate-region latency before changing Vercel configuration. A later database migration needs backups, restore rehearsal, maintenance planning, RLS verification, storage/auth cutover, and rollback criteria.

## Request and authentication flow

Middleware refreshes/verifies session claims only on routes that can use an authenticated session. Public legal/auth pages, static assets, webhooks, and internally authenticated cron routes do not pay this cost. Server-rendered workspace routes use request-scoped React caching and verified JWT claims, then fetch profile and membership in parallel, followed by organization and subscription in parallel. Authorization remains enforced by Supabase RLS and explicit tenant filters.

Never cache workspace context globally. Request-scoped memoization is safe; cross-request caching of users, memberships, roles, or signed URLs is not.

## Data-fetching and pagination policy

- Select only fields required by the rendered view.
- Run independent queries concurrently.
- Keep tenant and archived-state predicates in every workspace query even when RLS also applies.
- Customer/company lists default to 20 records. Large lists must use server pagination, filtering, and sorting.
- Owner search waits for two characters, debounces by 220 ms, aborts stale requests, and returns at most 25 results.
- Document lists must remain bounded. Use indexed expiry/status filters and keyset pagination when datasets outgrow offset pagination.
- Dashboard aggregates and bounded detail rows come from one tenant-scoped RPC. Customer list summaries and owner search likewise use one bounded RPC each.

## Database indexing principles

High-traffic indexes are tenant-first and follow the actual filter/order shape. Existing migrations cover active organization documents by expiry/status, follow-ups by due date, recent activity, customer/company trigram search, document name/number search, import batches, and upload cleanup. New indexes require a canonical forward migration and representative `EXPLAIN (ANALYZE, BUFFERS)` evidence. Never disable or bypass RLS for performance.

## Private document lifecycle

1. The browser validates PDF, JPEG, PNG, or WebP and a maximum size of 10 MiB.
2. A server action validates tenant ownership and creates pending document/version metadata.
3. The action issues a short-lived signed R2 PUT URL.
4. The browser uploads directly to private R2; the application server does not proxy the file.
5. The server verifies object content length and content type with `HEAD`, then atomically finalizes the version through a Postgres RPC.
6. Extraction reads the private object on the server, sends it to Gemini, validates structured JSON, and stores review-required data.
7. The user confirms or corrects extracted data before expiry fields become canonical.

Originals remain private and are retained. Signed downloads are short-lived and tenant-checked. The system does not currently create thumbnails or optimized OCR derivatives. PDFs are not recompressed. The 10 MiB bound limits server memory exposure; inline Gemini input still expands the payload by roughly one third but no longer needs an extra byte-buffer copy. Google's Files API retains uploads for up to 48 hours and is intended for larger or reused inputs, so it is not used for these one-shot private documents without an explicit retention decision.

Extraction calls have a 60-second provider timeout. Failure moves the record to `failed`; the UI offers bounded retry and manual entry. A document is never marked processed before successful extraction persistence.

## Loading and mutation conventions

- Route navigation uses Next.js links/router navigation, not full-page location changes.
- Buttons that submit asynchronous work disable duplicate submission and show explicit action text.
- Searches show loading, empty, and recoverable error states.
- Upload UI distinguishes upload, analysis, review, failure, and saved states.
- Mutations invalidate only affected routes. Avoid application-wide refreshes; where an action already returns canonical data, update the local view before requesting revalidation.
- Network operations need bounded timeouts. Retry only transient failures with a finite backoff and preserve idempotency.

## Caching policy

- Highly dynamic: current edits, upload status, extraction status, and signed URLs are not cached.
- Moderately dynamic: lists and dashboard data may use short controlled revalidation only after correctness and tenant isolation tests exist.
- Static/reference: document types and stable configuration may be request-cached and later use explicit tag invalidation.
- Private responses must never enter a shared CDN cache.

## Observability

Development and opt-in production timing (`PERF_TIMINGS=1`) covers dashboard/customer/owner queries, signed upload creation, upload HEAD verification, document download, and Gemini extraction. Never log tokens, signed URLs, raw document data, prompts containing document content, passwords, or unnecessary PII.

## Known constraints and required follow-up

- The deployed application remains in `iad1` until the source-controlled `icn1` configuration is deployed.
- Local plans on 2,000 customers and 10,000 documents reduced the paginated customer-summary query from 51.3 ms (20 repeated sequential scans) to 3.8 ms (index-only scans). The representative dashboard snapshot payload was 2,504 bytes.
- The production demo returned to login as unavailable, blocking authenticated production browser baselines.
- R2 placement is not exposed by repository configuration. Confirm bucket jurisdiction/placement in Cloudflare before any storage topology change.
