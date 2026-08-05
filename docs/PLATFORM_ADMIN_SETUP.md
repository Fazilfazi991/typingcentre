# Platform Admin Setup

1. Create and confirm an Auth user through the Supabase dashboard.
2. Verify the profile trigger created `public.profiles`.
3. As an authorized database administrator, run `update public.profiles set platform_role = 'platform_admin' where id = 'AUTH_USER_UUID';` using the exact intended user UUID.
4. Verify that row and test `/platform`.

There is no browser endpoint or self-service UI for role promotion.
