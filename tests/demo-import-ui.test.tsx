// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoImport } from "@/app/imports/new/demo-import";
import type { DemoImportState } from "@/lib/imports/demo-types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const state = (status: string): DemoImportState => ({
  job: {
    id: "sample-job",
    file_name: "note-it-demo-import.csv",
    status,
    total_rows: 10,
    customers_created: 7,
    companies_created: 1,
    documents_created: 8,
    records_updated: 0,
    records_skipped: 2,
    records_failed: 0,
  },
  rows: [],
});
describe("Demo Import experience", () => {
  it("offers only the deployed fictional sample and private-workspace link", () => {
    const { container } = render(<DemoImport initialSample={null} />);
    expect(screen.getByRole("button", { name: "Try Sample Import" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download Sample CSV" }).getAttribute("href")).toBe(
      "/api/imports/demo/sample",
    );
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText("Only fictional sample data can be imported here.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Create Your Workspace/ }).getAttribute("href")).toBe(
      "/signup",
    );
  });
  it("shows actual job counts and links to the real records/history", () => {
    render(<DemoImport initialSample={state("completed")} />);
    expect(screen.getByRole("heading", { name: "Import Complete" })).toBeTruthy();
    expect(screen.getByText("Customers created").nextSibling?.textContent).toBe("7");
    expect(screen.getByText("Documents created").nextSibling?.textContent).toBe("8");
    expect(screen.getByText("Failed").nextSibling?.textContent).toBe("0");
    expect(screen.getByRole("link", { name: "View Customers" }).getAttribute("href")).toBe(
      "/customers",
    );
    expect(screen.getByRole("link", { name: "View Documents" }).getAttribute("href")).toBe(
      "/documents",
    );
    expect(screen.getByRole("link", { name: "View Import Details" }).getAttribute("href")).toBe(
      "/settings/data-import/sample-job",
    );
  });
  it("requires the explained reset confirmation and sends an action only", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sample: null }) });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    render(<DemoImport initialSample={state("completed")} />);
    await user.click(screen.getByRole("button", { name: "Reset Demo & Try Again" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Reset restores the entire fictional Demo workspace/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirm Reset Demo" }));
    expect(fetch).toHaveBeenCalledWith(
      "/api/imports/demo",
      expect.objectContaining({ body: '{"action":"reset"}' }),
    );
    expect(await screen.findByRole("button", { name: "Try Sample Import" })).toBeTruthy();
    expect(assign).toHaveBeenCalledWith("/imports/new");
  });
  it("keeps the results and shows an error when reset fails", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Demo reset could not finish." }),
      }),
    );
    const user = userEvent.setup();
    render(<DemoImport initialSample={state("completed")} />);
    await user.click(screen.getByRole("button", { name: "Reset Demo & Try Again" }));
    await user.click(screen.getByRole("button", { name: "Confirm Reset Demo" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Demo reset could not finish.",
    );
    expect(screen.getByRole("heading", { name: "Import Complete" })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
  it("offers recovery for a blocked or damaged preview", () => {
    render(<DemoImport initialSample={null} initialError="The preview needs reset." />);
    expect(screen.getByRole("alert").textContent).toBe("The preview needs reset.");
    expect(screen.getByRole("button", { name: "Reset Demo & Try Again" })).toBeTruthy();
  });
});

const pageMocks = vi.hoisted(() => ({
  context: vi.fn(),
  isDemo: vi.fn(),
  canUse: vi.fn(),
  sample: vi.fn(),
}));
vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext: pageMocks.context }));
vi.mock("@/lib/demo/workspace", () => ({ isDemoWorkspace: pageMocks.isDemo }));
vi.mock("@/lib/imports/demo", () => ({
  canUseDemoImport: pageMocks.canUse,
  getDemoImport: pageMocks.sample,
}));
vi.mock("@/components/workspace-shell", () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/app/imports/new/import-uploader", () => ({
  ImportUploader: () => <div>Private CSV / XLSX importer</div>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import NewImportPage from "@/app/imports/new/page";
describe("Import route access", () => {
  beforeEach(() => {
    pageMocks.context.mockResolvedValue({
      organization: { name: "Workspace" },
      membership: { role: "owner" },
    });
    pageMocks.isDemo.mockReturnValue(false);
    pageMocks.canUse.mockReturnValue(true);
    pageMocks.sample.mockResolvedValue(null);
  });
  it("opens the sample interface for Demo Mode", async () => {
    pageMocks.isDemo.mockReturnValue(true);
    render(await NewImportPage());
    expect(screen.getByRole("button", { name: "Try Sample Import" })).toBeTruthy();
    expect(screen.queryByText("Private CSV / XLSX importer")).toBeNull();
  });
  it.each(["owner", "admin"])("keeps the real importer for a normal %s", async (role) => {
    pageMocks.context.mockResolvedValue({
      organization: { name: "Workspace" },
      membership: { role },
    });
    render(await NewImportPage());
    expect(screen.getByText("Private CSV / XLSX importer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try Sample Import" })).toBeNull();
  });
  it("rejects unauthorized normal members", async () => {
    pageMocks.context.mockResolvedValue({
      organization: { name: "Workspace" },
      membership: { role: "member" },
    });
    await expect(NewImportPage()).rejects.toThrow("NOT_FOUND");
  });
});
