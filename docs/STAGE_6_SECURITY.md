# Stage 6 Security

R2 credentials exist only in server-only modules. Browser code receives at most a short-lived signed URL for a single `PutObject` or `GetObject` operation; it never receives R2 credentials, a raw object key as authority, or a permanent/public URL.

Keys follow `organizations/{organizationId}/documents/{documentId}/versions/{versionId}/{randomUuid}.{extension}`. They exclude customer names and document/identity numbers. Original filenames are retained only as version metadata.

The Stage 6 migration adds tenant composite foreign keys, active-entity checks, branch/company compatibility checks, creator/uploader triggers, RLS policies, and a tenant-scoped security-definer finalisation RPC. The RPC is explicitly granted only to `authenticated`, verifies the active owner context, and is not exposed to `PUBLIC`.

The current version is only assigned after R2 metadata verification. Versions are immutable in normal use, document archive is a soft archive, and archive does not delete R2 objects. Platform administrators receive no automatic document-data access.
