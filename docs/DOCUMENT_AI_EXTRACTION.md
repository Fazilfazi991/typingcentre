# Smart document upload and extraction

RenewTrack stores the original PDF/image privately in Cloudflare R2, then sends that one stored file to the configured provider for extraction. The browser never receives Gemini or R2 credentials. The default provider is Gemini using `gemini-3.1-flash-lite`, which accepts PDFs and common image formats natively.

## Setup

Set these server-only values in the deployment environment:

```text
DOCUMENT_AI_PROVIDER=gemini
GEMINI_API_KEY=your-server-side-key
GEMINI_DOCUMENT_MODEL=gemini-3.1-flash-lite
```

R2 must already be configured as described in `STAGE_6_R2_SETUP.md`. No document bytes or base64 copies are written to Postgres.

## Manual QA

Use non-production, synthetic samples only. From a customer or company detail page choose **Add document**, select a starting type, then choose a PDF/JPEG/PNG/WebP up to 10 MB.

Expected flow: secure upload → analysis → editable review → **Confirm & Save**. Test a passport, Emirates ID, visa, trade licence, and an unrelated certificate. Confirm that unknown material is labelled **Other**, low-confidence expiry values are warned about, edits are retained, and a failed analysis still leaves the private file available for manual entry/retry.

After confirmation, verify `documents.document_number`, `issued_on`, `expires_on`, and `display_name` contain the reviewed canonical values. Verify R2 contains the opaque `organizations/{organizationId}/documents/...` object key and that an account in another organization cannot use the document or signed URL actions.
