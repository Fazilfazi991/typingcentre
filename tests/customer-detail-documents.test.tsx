import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, notFound, redirect } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  redirect: vi.fn(() => { throw new Error("REDIRECT"); }),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/workspace-shell", () => ({ WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/archive-dialog", () => ({ ArchiveDialog: () => null }));

import CustomerDetail from "@/app/customers/[customerId]/page";

const customerId = "11111111-1111-4111-8111-111111111111";
const customer = { id: customerId, full_name: "Mohammed Sameer", customer_type: "individual", nationality: null, archived_at: null, phone: "+971500000000", whatsapp_number: null, email: null, date_of_birth: null, passport_number: null, emirates_id_number: null, companies: { name: "Linked company" }, branches: null };

function workspace(documents: unknown[]) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder = (table: string): any => ({
    select: (...args: unknown[]) => (calls.push([`${table}.select`, ...args]), builder(table)),
    eq: (...args: unknown[]) => (calls.push([`${table}.eq`, ...args]), builder(table)),
    is: (...args: unknown[]) => (calls.push([`${table}.is`, ...args]), builder(table)),
    order: (...args: unknown[]) => {
      calls.push([`${table}.order`, ...args]);
      return table === "documents" ? Promise.resolve({ data: documents, error: null }) : builder(table);
    },
    maybeSingle: () => Promise.resolve({ data: table === "customers" ? customer : null, error: null }),
    limit: () => Promise.resolve({ data: [], error: null }),
  });
  getWorkspaceContext.mockResolvedValue({
    supabase: { from: (table: string) => (calls.push(["from", table]), builder(table)) },
    organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" },
  });
  return calls;
}

describe("customer detail canonical documents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists direct customer documents from the tenant-scoped canonical table, including no-expiry documents", async () => {
    const calls = workspace([
      { id: "quick-scan-document", display_name: "Emirates ID", document_number: "784-123", expires_on: "2027-01-01", status: "valid", current_version_id: "version-2", organization_document_types: { name: "Emirates ID" } },
      { id: "no-expiry-document", display_name: "Supporting letter", document_number: null, expires_on: null, status: "valid", current_version_id: "version-1", organization_document_types: { name: "Supporting letter" } },
    ]);
    const html = renderToStaticMarkup(await CustomerDetail({ params: Promise.resolve({ customerId }), searchParams: Promise.resolve({}) }));

    expect(calls).toContainEqual(["from", "documents"]);
    expect(calls).toContainEqual(["documents.eq", "organization_id", "tenant-a"]);
    expect(calls).toContainEqual(["documents.eq", "customer_id", customerId]);
    expect(calls).toContainEqual(["documents.is", "archived_at", null]);
    expect(html).toContain("Emirates ID");
    expect(html).toContain("No expiry date");
    expect(html).toContain("/documents/quick-scan-document");
    expect(html).not.toContain("No documents added yet.");
  });

  it("uses the empty state only when the canonical customer query returns no active documents", async () => {
    workspace([]);
    const html = renderToStaticMarkup(await CustomerDetail({ params: Promise.resolve({ customerId }), searchParams: Promise.resolve({}) }));
    expect(html).toContain("No documents added yet.");
  });
});
