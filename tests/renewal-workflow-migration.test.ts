import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260813163717_renewal_workflow_hardening.sql"),
  "utf8",
);

describe("renewal workflow migration", () => {
  it("enforces tenant ownership for every renewal write path", () => {
    expect(sql).toContain("renewals_replacement_document_tenant_fk");
    expect(sql).toMatch(/create policy renewals_insert_owner[\s\S]*is_organization_owner\(organization_id\)/);
    expect(sql).toMatch(/create policy renewals_update_owner[\s\S]*using[\s\S]*is_organization_owner\(organization_id\)/);
    expect(sql).toMatch(/where user_id = \(select auth\.uid\(\)\)[\s\S]*is_primary_owner[\s\S]*status = 'active'/);
  });

  it("uses one atomic, invoker-scoped renewal completion transaction", () => {
    expect(sql).toMatch(/create function public\.complete_document_renewal[\s\S]*security invoker/);
    expect(sql).toMatch(/for update;[\s\S]*insert into public\.documents[\s\S]*set archived_at[\s\S]*set status = 'completed'/);
    expect(sql).toContain("replacement_expires_on <= current_date");
    expect(sql).toContain("perform public.log_workspace_activity('renewal_completed'");
    expect(sql).toContain("revoke all on function public.complete_document_renewal");
  });

  it("indexes the leading-wildcard global search fields", () => {
    expect(sql).toContain("create extension if not exists pg_trgm");
    expect(sql.match(/gin_trgm_ops/g)?.length).toBeGreaterThanOrEqual(8);
  });
});
