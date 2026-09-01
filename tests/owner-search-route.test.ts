import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getWorkspaceContext, rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getWorkspaceContext: vi.fn(),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));

import { GET } from "@/app/api/workspace/owner-search/route";

describe("owner search route", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: [{ id: "customer-a", label: "Alice", description: null }], error: null });
    getWorkspaceContext.mockReset().mockResolvedValue({ organization: { id: "tenant-a" }, supabase: { rpc } });
  });

  it("rejects one-character searches without a database call", async () => {
    const response = await GET(new NextRequest("https://example.test/api/workspace/owner-search?kind=customer&q=a"));
    expect(await response.json()).toEqual({ results: [] });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses one bounded tenant-scoped RPC request", async () => {
    const response = await GET(new NextRequest("https://example.test/api/workspace/owner-search?kind=customer&q=Alice"));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("owner_search", {
      target_organization_id: "tenant-a",
      owner_kind: "customer",
      search_text: "Alice",
      result_limit: 25,
    });
  });
});
