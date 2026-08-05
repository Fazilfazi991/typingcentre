import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL("../supabase/migrations/20260805170848_stage_4_row_level_security.sql", import.meta.url);

describe("Stage 4 RLS migration", () => {
  it("protects every current public application table", async () => {
    const sql = await readFile(migrationPath, "utf8");
    for (const table of ["profiles", "organizations", "organization_memberships", "organization_subscriptions", "organization_usage_counters", "branches", "companies", "customers", "organization_document_types", "documents", "renewals", "follow_ups", "notifications", "activity_logs", "audit_logs"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("uses non-exposed, fixed-search-path membership helpers", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create schema if not exists security;");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("revoke all on all tables in schema public from anon;");
    expect(sql).not.toContain("using (true)");
  });
});
