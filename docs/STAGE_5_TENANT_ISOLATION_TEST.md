# Stage 5 Tenant Isolation Test

Live verification ran on 2026-08-05 using authenticated sessions for the two fictional owners in `STAGE_5_TEST_ACCOUNT_SETUP.md`.

| Check | Result |
| --- | --- |
| Exact UUID SELECT for the other tenant's company, customer, branch and follow-up | Passed: zero rows |
| Cross-tenant company update | Passed: zero returned rows |
| Insert with another organisation ID | Passed: RLS rejected it |
| Cross-tenant branch/company relationship | Passed: rejected |
| Own-tenant company, branch, customer and follow-up creation | Passed |
| Own-tenant company update, customer archive and follow-up completion | Passed after corrective policy |
| Archived record visibility | Passed: visible only to owning owner; normal active lists filter archived records |

The checks used the public key plus authenticated owner sessions. No service-role client was used. Browser direct-URL testing remains pending because the local development server hung during this verification session.
