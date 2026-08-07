# Stage 6 Documents Overview

Stage 6 begins private document storage. Stage 5 remains functionally implemented but formally unsigned; its deferred live browser, responsive, accessibility, console/network, and tenant-isolation QA backlog remains unchanged.

## Phase 6A status

- Prepared: metadata/version schema migration, server-only R2 client, signed PUT/GET helpers, HeadObject finalisation design, pure validation tests, and manual setup documentation.
- Blocked: remote SQL application, private R2 bucket creation, credential configuration, direct-upload UI, and browser QA.
- Not started: reminders, public buckets, payments, Staff, OCR, and Stage 7.

## Model

`documents` retains owner metadata, optional customer/company ownership, optional company branch, dates, notes, archive timestamp, creator, and a current-version pointer. `document_versions` retains immutable object metadata and upload state. A version is pending until R2 `HeadObject` confirms the exact key, content type, and byte size.

Expiry is presented dynamically: archived, no expiry, expired, expiring soon (within 30 calendar days), or active. No reminder scheduling is created.

Historical versions and R2 objects are retained during normal archival. Pending/failed objects become eligible for a future cleanup process after 24 hours; no cleanup cron is implemented.
