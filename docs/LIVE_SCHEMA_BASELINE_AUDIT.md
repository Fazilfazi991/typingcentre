# Live Schema Baseline Audit

Audit date: 2026-08-05. Project: `swnuikslynuneucetjub`.

## Local migrations

| Version | File | Intended result |
| --- | --- | --- |
| `20260805162339` | `initial_multi_tenant_schema.sql` | Extension, nine enums, fifteen tenant/accountability tables, tenant foreign keys, indexes, update triggers and no RLS. |
| `20260805164117` | `auth_profiles_and_onboarding.sql` | `profiles`, usage counters, organisation/membership status fields, profile trigger and onboarding RPC. |

## Live inspection result

The dashboard SQL Editor catalog queries found all fifteen public tables from the local migrations: `organizations`, `organization_memberships`, `organization_subscriptions`, `organization_usage_counters`, `branches`, `companies`, `customers`, `organization_document_types`, `documents`, `renewals`, `follow_ups`, `notifications`, `activity_logs`, `audit_logs`, and `profiles`.

The live column counts match the intended migration shape. The public function catalog contains `set_updated_at` as invoker, plus `handle_new_auth_user` and `onboard_current_user` as definer functions with `search_path=public, auth`. The public update triggers plus the profile update trigger are present. The auth-user trigger is included in the reproducible snapshot query because it belongs to the `auth` table schema.

The constraints/index catalog query returned the expected primary keys, tenant/composite foreign keys, checks, unique constraints, partial indexes and unique partial primary-owner index. The dashboard truncates a wide result at 100 rows, so this audit is evidence-backed but not a byte-for-byte `pg_dump` comparison.

No public views were reported by the inspected schema. No remote-only application table, function, or view was detected in the reviewed catalog output.

## Snapshot

`database-snapshots/pre-stage-4-public-schema.sql` is the sanitized, reproducible catalog-query snapshot. A proper `pg_dump` was not possible without an authorised database or CLI connection; no data, credentials, connection strings, or auth users are captured.

## Migration ledger

The hosted migration ledger has no Stage 2 or Stage 3 records because those SQL files were executed through the SQL Editor. The live schema was created by the exact local SQL scripts in one completed transaction, then inspected through catalog queries. `db push`, `db reset`, remote `migration up`, and seed execution remain prohibited until the ledger can be repaired.

## Baseline decision

The preferred method is migration repair for versions `20260805162339` and `20260805164117`, but it is blocked: the locally authenticated CLI account cannot access the project Management API. Do not write directly to `supabase_migrations.schema_migrations` from the SQL Editor. Stage 4 migration `20260805170848` was therefore manually applied after review while migration history remains pending.

Risks: a later `db push` could replay existing DDL. Resolve the repair before returning to a normal CLI deployment workflow.
