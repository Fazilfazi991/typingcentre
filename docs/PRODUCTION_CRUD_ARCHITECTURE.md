# Production CRUD Architecture

Production routes resolve the active workspace on the server from the authenticated user's primary owner membership. Server actions validate FormData with Zod, set the organisation from that server context, and use the authenticated Supabase client. RLS remains the database authority; no routine CRUD uses a service-role key.

Lists explicitly scope by organisation and active-record state. Detail queries rely on RLS and return `notFound()` for inaccessible UUIDs. Database errors map to short user-safe messages. Activity logging is best-effort after the core mutation, so an activity-log failure does not roll back the completed CRM write. Archives set `archived_at`; no UI hard-delete action exists.
