# Stage 6 Browser QA

Status: blocked until the owner manually applies the Stage 6 migration, configures private Cloudflare R2, and supplies server-only R2 environment variables outside Git.

Required later checks:

- Amina and Daniel each create own-tenant customer, company, and branch-associated documents.
- PDF and image direct uploads use R2 PUT requests, show safe progress/failure states, and finalise through HeadObject verification.
- Current-file preview and download use short-lived signed GET URLs only.
- Replacement versions preserve history and select exactly one current version.
- Archived documents remain retained/read-only according to approved historical access.
- Cross-tenant document, version, signing, finalisation, relationship-ID, random UUID, and malformed UUID requests produce neutral not-found or safe feedback.
- Responsive, keyboard, form-label/error, dialog, console, and network checks pass with no credentials, signed URLs, tokens, raw RLS errors, or file proxying through Vercel.

Stage 6 remains unsigned. This does not change the deferred Stage 5 sign-off backlog.
