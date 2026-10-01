// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext: mocks.context }));
vi.mock("@/components/workspace-shell", () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: () => {
    throw new Error("REDIRECT");
  },
}));
import ImportDetailPage from "@/app/settings/data-import/[jobId]/page";
afterEach(cleanup);
it("loads tenant-scoped job history and looks up its importer without a nonexistent profile relationship", async () => {
  const queries: { table: string; columns: string; filters: Record<string, unknown> }[] = [];
  const supabase = {
    from(table: string) {
      const record = { table, columns: "", filters: {} as Record<string, unknown> };
      queries.push(record);
      const result =
        table === "import_jobs"
          ? {
              id: "job",
              created_by: "demo-owner",
              file_name: "note-it-demo-import.csv",
              source_format: "csv",
              status: "completed",
              total_rows: 10,
              customers_created: 7,
              companies_created: 1,
              documents_created: 8,
              records_updated: 0,
              records_skipped: 2,
              records_failed: 0,
              mapping: {},
            }
          : table === "profiles"
            ? { full_name: "Demo Owner", email: "demo@example.invalid" }
            : [];
      const query: any = {
        select(columns: string) {
          record.columns = columns;
          return query;
        },
        eq(key: string, value: unknown) {
          record.filters[key] = value;
          return query;
        },
        order: () => query,
        range: () => query,
        maybeSingle: async () => ({ data: result }),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: result, count: 0 }).then(resolve),
      };
      return query;
    },
  };
  mocks.context.mockResolvedValue({ supabase, organization: { id: "demo-org", name: "Demo" } });
  render(
    await ImportDetailPage({
      params: Promise.resolve({ jobId: "job" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(screen.getByRole("heading", { name: "Import Details" })).toBeTruthy();
  expect(screen.getByText("Demo Owner")).toBeTruthy();
  expect(screen.getByText("Created").nextSibling?.textContent).toBe("16");
  expect(queries.find((q) => q.table === "import_jobs")).toEqual({
    table: "import_jobs",
    columns: "*",
    filters: { id: "job", organization_id: "demo-org" },
  });
  expect(queries.find((q) => q.table === "profiles")?.filters).toEqual({ id: "demo-owner" });
});
