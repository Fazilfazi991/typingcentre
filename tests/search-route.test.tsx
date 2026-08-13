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

import SearchPage from "@/app/search/page";

const records: Record<string, any[]> = {
  customers: [
    { id: "customer-a", organization_id: "tenant-a", full_name: "Huda Ahmed", phone: "050123", companies: { name: "Tenant A LLC" } },
    { id: "customer-b", organization_id: "tenant-b", full_name: "Huda Secret", phone: "050999", companies: null },
  ],
  companies: [{ id: "company-a", organization_id: "tenant-a", name: "Huda Services", licence_number: "LIC-42" }],
  documents: [{ id: "document-a", organization_id: "tenant-a", display_name: "Huda Passport", document_number: "P-10", expires_on: "2027-01-01", customers: { full_name: "Huda Ahmed" }, companies: null, organization_document_types: { name: "Passport" } }],
};

describe("tenant-scoped global search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches supported identity fields and never renders another organization", async () => {
    const calls: Array<[string, string, unknown?]> = [];
    getWorkspaceContext.mockResolvedValue({
      organization: { id: "tenant-a", name: "Tenant A" },
      supabase: {
        from: (table: string) => {
          let tenant: string | undefined;
          const builder: any = {
            select: () => builder,
            eq: (column: string, value: string) => (calls.push([table, `eq:${column}`, value]), tenant = value, builder),
            is: () => builder,
            or: (value: string) => (calls.push([table, "or", value]), builder),
            limit: () => Promise.resolve({ data: records[table].filter((row) => row.organization_id === tenant), error: null }),
          };
          return builder;
        },
      },
    });

    const html = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ search: "Huda" }) }));
    expect(getWorkspaceContext).toHaveBeenCalledWith("/search?search=Huda");
    expect(calls.filter(([, method]) => method === "eq:organization_id")).toHaveLength(3);
    expect(calls).toContainEqual(["customers", "eq:organization_id", "tenant-a"]);
    expect(calls.find(([table, method]) => table === "customers" && method === "or")?.[2]).toContain("emirates_id_number.ilike");
    expect(calls.find(([table, method]) => table === "companies" && method === "or")?.[2]).toContain("licence_number.ilike");
    expect(html).toContain("Huda Ahmed");
    expect(html).toContain("Huda Services");
    expect(html).toContain("/documents/document-a");
    expect(html).not.toContain("Huda Secret");
  });

  it("does not query broad tables for a one-character search", async () => {
    const from = vi.fn();
    getWorkspaceContext.mockResolvedValue({ organization: { id: "tenant-a", name: "Tenant A" }, supabase: { from } });
    const html = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ search: "H" }) }));
    expect(from).not.toHaveBeenCalled();
    expect(html).toContain("Enter at least two characters");
  });
});
