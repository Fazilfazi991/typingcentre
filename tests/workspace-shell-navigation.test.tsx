// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoWorkspace } from "@/lib/demo/workspace";

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext: vi.fn() }));
vi.mock("@/lib/demo/workspace", () => ({ isDemoWorkspace: vi.fn() }));
vi.mock("@/app/(auth)/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/app/demo/actions", () => ({ exitDemoAction: vi.fn() }));
vi.mock("@/components/dashboard-header", () => ({ DashboardHeader: () => null }));
vi.mock("@/components/note-it-logo", () => ({ NoteItLogo: () => null }));
vi.mock("@/components/mobile-navigation", () => ({ MobileNavigation: ({ canImport }: { canImport: boolean }) => <span data-testid="mobile-import-access">{String(canImport)}</span> }));

const workspace = (role: string) => ({
  membership: { role },
  organization: { id: "workspace-id", slug: "workspace", location: "Dubai" },
  subscription: { plan: "starter" },
  profile: { full_name: "Test User" },
  user: { email: "test@example.com" },
  supabase: { from: () => ({ select: () => ({ eq: () => ({ is: async () => ({ count: 0 }) }) }) }) },
});

describe("workspace import navigation", () => {
  afterEach(cleanup);

  it("renders the requested desktop order and mobile access for an owner", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(workspace("owner") as never);
    vi.mocked(isDemoWorkspace).mockReturnValue(false);
    render(await WorkspaceShell({ organizationName: "Test Workspace", children: null }));

    const sidebar = screen.getByLabelText("Workspace navigation");
    expect(within(sidebar.querySelector("nav")!).getAllByRole("link").map((link) => link.querySelector("span")?.textContent)).toEqual([
      "Dashboard", "Service Requests", "Customers", "Companies", "Documents", "Import Data",
      "Renewals", "Calendar", "Follow-ups", "Reports", "Settings",
    ]);
    expect(within(sidebar).getByRole("link", { name: "Import Data" }).getAttribute("href")).toBe("/imports/new");
    expect(screen.getByTestId("mobile-import-access").textContent).toBe("true");
  });

  it.each([{ role: "member", demo: false }])("hides import for $role when demo is $demo", async ({ role, demo }) => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(workspace(role) as never);
    vi.mocked(isDemoWorkspace).mockReturnValue(demo);
    render(await WorkspaceShell({ organizationName: "Test Workspace", children: null }));

    expect(within(screen.getByLabelText("Workspace navigation")).queryByRole("link", { name: "Import Data" })).toBeNull();
    expect(screen.getByTestId("mobile-import-access").textContent).toBe("false");
  });

  it("shows Import Data between Documents and Renewals in Demo Mode", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(workspace("owner") as never);
    vi.mocked(isDemoWorkspace).mockReturnValue(true);
    render(await WorkspaceShell({ organizationName: "Demo Workspace", children: null }));
    const links = within(screen.getByLabelText("Workspace navigation")).getAllByRole("link").map(link => link.textContent);
    const index = links.findIndex(label => label?.includes("Import Data"));
    expect(links[index-1]).toContain("Documents");
    expect(links[index+1]).toContain("Renewals");
    expect(screen.getByTestId("mobile-import-access").textContent).toBe("true");
  });
});
