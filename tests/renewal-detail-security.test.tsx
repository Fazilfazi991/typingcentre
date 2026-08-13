import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, notFound, redirect } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/components/workspace-shell", () => ({ WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/features/renewals/actions", () => ({
  addRenewalNoteAction: vi.fn(), closeRenewalAction: vi.fn(), completeRenewalAction: vi.fn(),
  markRenewalContactedAction: vi.fn(), scheduleRenewalFollowUpAction: vi.fn(),
}));

import RenewalDetail from "@/app/renewals/[documentId]/page";

describe("renewal direct URL security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when the document is outside the authenticated organization", async () => {
    const filters: Array<[string, string]> = [];
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: string) => (filters.push([column, value]), builder),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    getWorkspaceContext.mockResolvedValue({
      supabase: { from: vi.fn(() => builder) },
      organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" },
    });
    await expect(RenewalDetail({
      params: Promise.resolve({ documentId: "foreign-document" }),
      searchParams: Promise.resolve({ range: "7d" }),
    })).rejects.toThrow("NOT_FOUND");
    expect(getWorkspaceContext).toHaveBeenCalledWith("/renewals/foreign-document?range=7d");
    expect(filters).toContainEqual(["id", "foreign-document"]);
    expect(filters).toContainEqual(["organization_id", "tenant-a"]);
  });
});
