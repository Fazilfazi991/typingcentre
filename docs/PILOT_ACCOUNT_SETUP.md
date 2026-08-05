# Pilot Account Setup

Do not reuse the Stage 2 seed UUIDs as Auth user IDs. Create fresh owner accounts for Al Noor Typing Centre, Smart Documents Services, and Emirates Business Hub through the owner-approved Supabase dashboard or a future server-only provisioning script. Connect each user to its organization with an `organization_memberships` record marked `owner`, `active`, and `is_primary_owner = true`; then verify login, membership, dashboard routing, and password reset. Never commit pilot passwords.
