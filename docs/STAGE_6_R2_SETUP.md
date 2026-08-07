# Stage 6 R2 Setup

Complete these steps manually before enabling direct uploads. Keep the bucket private: do not configure a public development URL or a custom public domain.

1. Create one private R2 bucket for RenewTrack documents.
2. Create a restricted R2 API token with access limited to that bucket. Store its access key and secret only in the deployment provider and local ignored `.env.local`.
3. Set these server-only variables. None may use a `NEXT_PUBLIC_` prefix.

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PRESIGNED_UPLOAD_TTL_SECONDS=300
R2_PRESIGNED_DOWNLOAD_TTL_SECONDS=300
R2_MAX_FILE_SIZE_BYTES=10485760
```

4. Configure bucket CORS with the actual local QA and production application origins. Replace the placeholders before applying this policy; do not use a wildcard origin.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-PRODUCTION-APP-ORIGIN"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

The client creates presigned URLs using AWS SDK v3, `region: "auto"`, and the S3-compatible R2 endpoint. URLs are bearer credentials, intentionally short-lived, never stored in the database, and must never be logged.
