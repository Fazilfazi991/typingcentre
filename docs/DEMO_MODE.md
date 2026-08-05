# Demo Mode

RenewTrack currently runs in demo mode. The legacy interface persists its generated records in browser LocalStorage under `renewtrack-session` and `renewtrack-store`; reset controls recreate its records. `src/lib/demo/fixtures.ts` records the account and organization identity, and `src/lib/demo/storage.ts` is the only new code allowed to access those keys.

Demo tenant isolation is a UI behavior only. Supabase tables, authenticated memberships and RLS policies will replace it in later stages. Normal demo users do not receive the preview switcher; the Platform Admin demo does.
