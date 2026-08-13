import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, redirect } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/workspace-shell", () => ({ WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import FollowUps from "@/app/follow-ups/page";

describe("follow-up date deep link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T05:00:00Z"));
  });

  function contextWithFollowUps() {
    const calls: Array<[string, string, ...unknown[]]> = [];
    const from = (table: string) => {
      const builder: any = {
        select: (...args: unknown[]) => (calls.push([table, "select", ...args]), builder),
        eq: (...args: unknown[]) => (calls.push([table, "eq", ...args]), builder),
        is: (...args: unknown[]) => (calls.push([table, "is", ...args]), builder),
        gte: (...args: unknown[]) => (calls.push([table, "gte", ...args]), builder),
        lt: (...args: unknown[]) => (calls.push([table, "lt", ...args]), builder),
        neq: (...args: unknown[]) => (calls.push([table, "neq", ...args]), builder),
        order: (...args: unknown[]) => {
          calls.push([table, "order", ...args]);
          return table === "follow_ups" ? builder : Promise.resolve({ data: [] });
        },
        limit: (...args: unknown[]) => (calls.push([table, "limit", ...args]), Promise.resolve({ data: [{ id: "follow-a", customer_id: "customer-a", company_id: null, due_at: "2026-08-13T08:00:00Z", status: "pending", completed_at: null, note: "Call customer", customer_response: null, next_follow_up_id: null, customers: { full_name: "Amina Customer" }, companies: null }] })),
      };
      return builder;
    };
    getWorkspaceContext.mockResolvedValue({ supabase: { from }, organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" } });
    return calls;
  }

  it("applies today’s timezone window and tenant scope", async () => {
    const calls = contextWithFollowUps();
    const html = renderToStaticMarkup(await FollowUps({ searchParams: Promise.resolve({ date: "today" }) }));
    expect(getWorkspaceContext).toHaveBeenCalledWith("/follow-ups?date=today");
    expect(calls).toContainEqual(["follow_ups", "eq", "organization_id", "tenant-a"]);
    expect(calls).toContainEqual(["follow_ups", "gte", "due_at", "2026-08-12T20:00:00.000Z"]);
    expect(calls).toContainEqual(["follow_ups", "lt", "due_at", "2026-08-13T20:00:00.000Z"]);
    expect(calls).toContainEqual(["follow_ups", "neq", "status", "completed"]);
    expect(html).toContain("Today’s follow-ups");
    expect(html).toContain("Amina Customer");
    expect(html).toContain("Date: Today");
  });

  it("redirects an invalid date filter to the canonical route", async () => {
    await expect(FollowUps({ searchParams: Promise.resolve({ date: "tomorrow" }) })).rejects.toThrow("REDIRECT:/follow-ups");
    expect(getWorkspaceContext).not.toHaveBeenCalled();
  });
});
