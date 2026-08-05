# RLS Testing

The Stage 4 local test plan uses transactional JWT-claim simulation with two fictional UUIDs. It verifies the helper access matrix, owner A/B organisation isolation, no direct membership/subscription/usage writes, no cross-tenant business reads, and no profile role escalation.

Live execution requires a clean SQL Editor query or an authorised local Supabase stack. Do not create real users, use real credentials, or run the development seed against production. The current hosted project has no linked CLI session, so pgTAP and the full live two-tenant suite remain pending after manual migration review.
