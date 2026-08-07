# Stage 6 Upload Flow

1. An authenticated owner submits document metadata and browser file metadata to a server action.
2. The server resolves the workspace, verifies customer/company/branch ownership and active state, generates document/version IDs and an opaque tenant-bound object key, then writes a pending version.
3. The server signs one `PutObject` URL for that key and MIME type. The browser uploads file bytes directly to R2 with the signed `Content-Type`; Vercel does not proxy the file.
4. The browser calls finalisation with only the version ID. The server tenant-scopes the pending version and uses `HeadObject` for the trusted key.
5. The finalisation RPC atomically marks the version complete, sets the current version, records safe activity metadata, and increments confirmed storage usage once. A repeat finalisation is idempotent.

Allowed initial formats are PDF, JPEG, PNG, and WebP. The default maximum size is 10 MiB. Filename, declared MIME type, and size are checked before signing; size and content type are checked again after upload. Direct upload cannot provide full file-signature or malware scanning, so both are explicitly deferred.

If an upload is missing or mismatched it remains uncurrent and gets a safe failure result. Pending and failed versions receive a future cleanup eligibility timestamp; no scheduled cleanup job exists in this stage.
