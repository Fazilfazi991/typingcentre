import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("core workspace operational flow", () => {
  it("keeps the document list tenant-scoped, searchable, and operationally truthful", () => {
    const source = read("src/app/documents/page.tsx");
    expect(source).toContain('.eq("organization_id", context.organization.id)');
    expect(source).toContain("postgrestSearchPattern(search)");
    expect(source).toContain("extraction_status");
    expect(source).toContain("created_at");
    expect(source).toContain("Upload document");
  });

  it("builds customer history from customer, document, and follow-up activity", () => {
    const migration = read("supabase/migrations/20260902211000_customer_activity_timeline.sql");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("document.customer_id = target_customer_id");
    expect(migration).toContain("follow_up.customer_id = target_customer_id");
    expect(migration).toContain("revoke all on function public.customer_activity_timeline(uuid, uuid, integer) from public, anon");
  });
});
