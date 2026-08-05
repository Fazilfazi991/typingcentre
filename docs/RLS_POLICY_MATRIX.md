# RLS Policy Matrix

| Resource | Authenticated access | Direct writes |
| --- | --- | --- |
| `profiles` | Own row; active platform admin may read profile metadata | Own `full_name` only |
| `organizations` | Active member's organisation; platform admin metadata | Owner safe profile fields only |
| memberships | Own rows only | None |
| subscriptions / usage | Owner own organisation; platform admin metadata | None |
| branches, companies, customers, document types, documents, renewals, follow-ups | Active member's organisation only | None in Stage 4 |
| notifications | Active member's organisation only | Own accessible row's `read_at` only |
| activity logs | Owner own organisation only | None |
| audit logs | No normal client access | None |

`anon` receives no public-table privileges. There are no `USING (true)` tenant policies and no client-supplied organisation authority.
