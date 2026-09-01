import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260901203000_abandon_incomplete_document_uploads.sql"),
  "utf8",
);
const actions = fs.readFileSync(path.join(process.cwd(), "src/features/documents/actions.ts"), "utf8");
const form = fs.readFileSync(path.join(process.cwd(), "src/features/documents/smart-upload-form.tsx"), "utf8");
const permissions = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260901210000_reconcile_abandon_document_upload_permissions.sql"),
  "utf8",
);

describe("failed document upload abandonment", () => {
  it("allows only an authenticated owner to abandon a non-complete version", () => {
    expect(migration).toMatch(/user_id = \(select auth\.uid\(\)\)[\s\S]*role = 'owner'[\s\S]*status = 'active'/);
    expect(migration).toContain("if target.upload_status = 'complete'");
    expect(migration).toContain("grant execute on function public.abandon_document_upload(uuid) to authenticated");
    expect(permissions).toContain("revoke all on function public.abandon_document_upload(uuid) from anon");
    expect(permissions).toContain("revoke all on function public.abandon_document_upload(uuid) from service_role");
  });

  it("removes the parent only when it has no finalized or remaining versions", () => {
    expect(migration).toMatch(/target_document\.current_version_id is null[\s\S]*not exists[\s\S]*delete from public\.documents/);
    expect(migration).toContain("delete from public.document_versions");
  });

  it("clears every binary-upload failure path", () => {
    expect(actions).toContain('rpc("abandon_document_upload"');
    expect(form.match(/abandonDocumentUpload\(\{ versionId: started\.data\.versionId \}\)/g)).toHaveLength(3);
  });
});
