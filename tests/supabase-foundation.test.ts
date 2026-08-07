import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260805162339_initial_multi_tenant_schema.sql"), "utf8");
const seed = readFileSync(resolve(process.cwd(), "supabase/seed.sql"), "utf8");

describe("Supabase foundation files", () => {
  it("defines all core tenant tables and composite tenant relationships", () => {
    for (const table of ["organizations", "organization_memberships", "organization_subscriptions", "branches", "companies", "customers", "organization_document_types", "documents", "renewals", "follow_ups", "notifications", "activity_logs", "audit_logs"]) {
      expect(migration).toContain(`create table public.${table}`);
    }
    expect(migration).toContain("foreign key (organization_id, customer_id)");
    expect(migration).toContain("foreign key (organization_id, document_type_id)");
    expect(migration).toContain("on delete set null (branch_id)");
    expect(migration).toContain("documents_organization_expiry_idx");
  });

  it("keeps RLS and storage work out of Stage 2", () => {
    expect(migration).not.toMatch(/enable row level security/i);
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).not.toMatch(/storage\.buckets/i);
  });

  it("seeds safe local tenant data without auth users", () => {
    expect(seed).toContain("Al Noor Typing Centre");
    expect(seed).toContain("Smart Documents Services");
    expect(seed).not.toMatch(/insert into auth\.users/i);
  });

  it("includes an idempotent fictional dashboard QA batch", () => {
    expect(seed).toContain("DEMO-AN-DOC-");
    expect(seed).toContain("@demo.renewtrack.invalid");
    expect(seed).toContain("generate_series(1, 36)");
    expect(seed).toContain("current_date + (n - 5)");
    expect(seed).toContain("renewal_in_progress");
  });
});
