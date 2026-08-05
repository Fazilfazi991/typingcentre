# RLS Implementation

Stage 4 migration `20260805170848_stage_4_row_level_security.sql` adds the non-exposed `security` schema, membership/platform helpers, explicit role grants, profile-field protection, RLS enablement, and policies for every public application table.

Tenant access requires an active membership, active organisation, `is_active=true`, and a subscription in `trial`, `active`, or `past_due`. `past_due` remains accessible for MVP. Suspended, removed, inactive, and cancelled organisations are denied. The schema has no `deleted_at` field; soft-deletion policy is deferred until that field exists.

Platform admins can read platform metadata (`profiles`, organisations, subscriptions and usage) but receive no customer, document, renewal, or audit-log cross-tenant policy. Platform support receives no special data access yet.

Direct client writes are deliberately limited to safe profile display-name changes, safe organisation profile fields for owners, and marking an accessible notification read. CRM, document, renewal, follow-up, membership, subscription, usage, audit, and activity writes remain deferred to their dedicated product stages.
