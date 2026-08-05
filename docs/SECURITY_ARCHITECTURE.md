# Planned Security Architecture

Supabase Auth, organisation memberships, server-side permission checks and PostgreSQL Row-Level Security protect every current tenant-owned public table. Browser code never receives a Supabase service-role key. Stage 4 uses non-exposed `security` helpers for membership and platform-role checks; platform admins receive metadata access only, not blanket customer or document access.

Documents will be private Cloudflare R2 objects. The server will validate user and organisation, issue short-lived presigned upload/download URLs, and log access. R2 credentials will remain server-only and ordinary document bodies will not be proxied through Vercel. Future security controls include audit logs, short-lived links, security headers and scheduled-operation secrets.
