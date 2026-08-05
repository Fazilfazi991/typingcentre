# Planned Security Architecture

This stage implements no production backend or production security. The planned model is Supabase Auth, organisation memberships, server-side permission checks and PostgreSQL Row-Level Security on every tenant-owned table. Browser code will never receive a Supabase service-role key.

Documents will be private Cloudflare R2 objects. The server will validate user and organisation, issue short-lived presigned upload/download URLs, and log access. R2 credentials will remain server-only and ordinary document bodies will not be proxied through Vercel. Future security controls include audit logs, short-lived links, security headers and scheduled-operation secrets.
