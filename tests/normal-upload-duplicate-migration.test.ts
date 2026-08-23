import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260819093000_normal_upload_drafts_and_duplicate_resolution.sql"),
  "utf8",
);

describe("normal document upload duplicate migration", () => {
  it("allows multiple numberless drafts while retaining unique real document numbers", () => {
    expect(sql).toContain("drop constraint if exists documents_organization_id_document_number_key");
    expect(sql).toMatch(/create unique index[\s\S]*documents_organization_document_number_unique[\s\S]*where document_number is not null/);
  });

  it("moves a same-owner completed upload into the existing document history atomically", () => {
    expect(sql).toMatch(/create or replace function public\.replace_document_from_upload[\s\S]*security definer/);
    expect(sql).toContain("draft.customer_id is distinct from existing.customer_id");
    expect(sql).toContain("draft.company_id is distinct from existing.company_id");
    expect(sql).toMatch(/set current_version_id = null[\s\S]*set document_id = existing\.id[\s\S]*set archived_at/);
  });

  it("requires an authenticated primary owner in the tenant before resolving a duplicate", () => {
    expect(sql).toMatch(/where user_id = \(select auth\.uid\(\)\)[\s\S]*is_primary_owner[\s\S]*status = 'active'/);
    expect(sql).toContain("security.is_organization_owner(target_organization_id)");
    expect(sql).toContain("grant execute on function public.replace_document_from_upload");
  });
});
