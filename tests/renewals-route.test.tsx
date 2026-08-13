import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, redirect } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/workspace-shell", () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

import RenewalsPage from "@/app/renewals/page";

const active = { status: "active", is_active: true, archived_at: null };
const rows = [
  { id: "customer-doc", organization_id: "tenant-a", display_name: "Passport", document_number: "P1", expires_on: "2026-08-13", status: "valid", is_active: true, archived_at: null, customer_id: "customer-a", company_id: null, branch_id: null, customers: { full_name: "Amina Customer", ...active }, companies: null, branches: null, organization_document_types: { name: "Passport", ...active } },
  { id: "company-doc", organization_id: "tenant-a", display_name: "Trade licence", document_number: "TL1", expires_on: "2026-08-20", status: "renewal_in_progress", is_active: true, archived_at: null, customer_id: null, company_id: "company-a", branch_id: "branch-a", customers: null, companies: { name: "Acme LLC", ...active }, branches: { name: "Deira Branch", ...active }, organization_document_types: { name: "Trade Licence", ...active } },
  { id: "other-tenant", organization_id: "tenant-b", display_name: "Secret", document_number: "S1", expires_on: "2026-08-13", status: "valid", is_active: true, archived_at: null, customer_id: "customer-b", company_id: null, branch_id: null, customers: { full_name: "Tenant B Secret", ...active }, companies: null, branches: null, organization_document_types: { name: "Passport", ...active } },
];

function contextWithRows(data = rows) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: any = {
    select: (...args: unknown[]) => (calls.push(["select", ...args]), builder),
    eq: (...args: unknown[]) => (calls.push(["eq", ...args]), builder),
    is: (...args: unknown[]) => (calls.push(["is", ...args]), builder),
    gte: (...args: unknown[]) => (calls.push(["gte", ...args]), builder),
    lt: (...args: unknown[]) => (calls.push(["lt", ...args]), builder),
    order: (...args: unknown[]) => (calls.push(["order", ...args]), builder),
    limit: (...args: unknown[]) => (calls.push(["limit", ...args]), Promise.resolve({ data, error: null })),
  };
  getWorkspaceContext.mockResolvedValue({
    supabase: { from: (table: string) => (calls.push(["from", table]), builder) },
    organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" },
  });
  return calls;
}

describe("renewals deep-link route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T05:00:00Z"));
  });

  it.each([
    ["today", "2026-08-14"],
    ["7d", "2026-08-21"],
    ["30d", "2026-09-13"],
    ["90d", "2026-11-12"],
  ])("applies the authenticated tenant %s range", async (range, upper) => {
    const calls = contextWithRows();
    const view = await RenewalsPage({ searchParams: Promise.resolve({ range }) });
    renderToStaticMarkup(view);
    expect(getWorkspaceContext).toHaveBeenCalledWith(`/renewals?range=${range}`);
    expect(calls).toContainEqual(["eq", "organization_id", "tenant-a"]);
    expect(calls).toContainEqual(["gte", "expires_on", "2026-08-13"]);
    expect(calls).toContainEqual(["lt", "expires_on", upper]);
  });

  it("applies the canonical expired range without accepting tenant input", async () => {
    const calls = contextWithRows();
    const view = await RenewalsPage({ searchParams: Promise.resolve({ range: "expired" }) });
    renderToStaticMarkup(view);
    expect(getWorkspaceContext).toHaveBeenCalledWith("/renewals?range=expired");
    expect(calls).toContainEqual(["eq", "organization_id", "tenant-a"]);
    expect(calls).toContainEqual(["lt", "expires_on", "2026-08-13"]);
    expect(calls.some(([method]) => method === "gte")).toBe(false);
  });

  it("renders customer, company and branch records with quick links while blocking cross-tenant rows", async () => {
    contextWithRows();
    const html = renderToStaticMarkup(await RenewalsPage({ searchParams: Promise.resolve({ range: "30d" }) }));
    expect(html).toContain("Amina Customer");
    expect(html).toContain("/customers/customer-a");
    expect(html).toContain("Acme LLC");
    expect(html).toContain("Deira Branch");
    expect(html).toContain("/companies/company-a");
    expect(html).toContain("/renewals/customer-doc?range=30d");
    expect(html).toContain("/renewals/company-doc?range=30d");
    expect(html).not.toContain("Tenant B Secret");
    expect(html).not.toContain("tenant-a");
    expect(html).toContain("mobile-card-list");
  });

  it("redirects a missing or invalid range to the canonical 30-day URL", async () => {
    await expect(RenewalsPage({ searchParams: Promise.resolve({ range: "invalid" }) })).rejects.toThrow("REDIRECT:/renewals?range=30d");
    expect(getWorkspaceContext).not.toHaveBeenCalled();
  });
});
