# Database Schema

## Current public tables

| Area | Tables |
| --- | --- |
| Identity and tenancy | `profiles`, `organizations`, `organization_memberships` |
| Subscription and usage | `organization_subscriptions`, `organization_usage_counters` |
| CRM foundation | `branches`, `companies`, `customers` |
| Documents and workflow | `organization_document_types`, `documents`, `renewals`, `follow_ups`, `notifications` |
| Accountability | `activity_logs`, `audit_logs` |

Every tenant-owned table uses `organization_id`; the Stage 2 composite foreign keys prevent cross-tenant references. Stage 3 adds the Auth profile trigger and atomic onboarding RPC. Stage 4 enables RLS on all of the above tables.

## Access model

An authenticated user must have an active membership in an active, enabled organisation whose subscription is `trial`, `active`, or `past_due`. Suspended, removed, inactive, and cancelled organisations are denied. Platform admin is an explicit `profiles.platform_role` value and has metadata access only.

The schema does not yet include the broader future tables for document versions, reminders, jobs, global plans, or uploads. Those will be introduced by their own migrations rather than pre-created speculatively.
