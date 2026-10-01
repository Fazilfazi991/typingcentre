# Typing centre service requests

This demo branch starts from `codex/core-workspace-operational-flow` (`ba350fb`). It adds a service catalog, copied request checklists, tenant owned work orders, and lightweight payments. Existing customers, companies, documents, Quick Scan, follow-ups, renewals, auth, R2, and reporting remain the source of truth for their respective records.

## Schema and access

`20261001131700_typing_centre_service_requests.sql` adds `services`, `service_requirements`, `service_requests`, `service_request_requirements`, `service_payments`, and private request counters. New foreign keys carry `organization_id`. RLS follows the active workspace member and owner policies. Trigger functions generate request numbers, copy requirements, validate transitions and attached document ownership, derive payment totals, and add activity events. New follow-ups can point to a request belonging to the same customer.

The catalog holds each tenant's prices. The government fee is an editable tenant estimate, not a global official fee. Existing requests keep their copied prices and checklist when the catalog changes.

`20261001132112_typing_centre_demo_reset.sql` extends the shared demo reset to remove request data before customer and document data, then restores fictional typing centre cases. The guarded `supabase/seeds/hosted-typing-centre-demo.sql` can seed the same cases in the dedicated `note-it-demo` workspace after the baseline hosted seed.

## Demo walkthrough

1. Open **Service Requests**. Ahmed Hassan's Residence Visa Renewal is waiting for a passport; an Emirates ID is already attached.
2. Open the request and choose **Upload / Quick Scan** on Passport. Quick Scan keeps the customer selected, saves the document with its extracted metadata and expiry, attaches it to the request checklist, and marks the item Received.
3. Advance the request to Ready to Submit, Submitted, Processing, Ready for Collection, and Completed. Record an application reference and a payment along the way.
4. Revisit Ahmed's customer page to see the service history, documents, follow-ups, activity, and outstanding balance. The saved document stays in expiry tracking.

The seed also includes waiting, processing, action required, collection, completed, partial payment, and overdue request examples. All names and contact details are fictional.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. With Docker Desktop running, run `npm run db:reset` and `npm run db:test` for the pgTAP integration checks, including tenant isolation, checklist copying, transition guards, document attachment, and payment derivation. The repo's hosted migration ledger differs from local history; reconcile it before applying these migrations to a hosted database, as described in `supabase/README.md`.
