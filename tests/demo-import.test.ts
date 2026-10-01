import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { WorkspaceContext } from "@/lib/workspace/context";
import {
  DEMO_IMPORT_FILE,
  DEMO_IMPORT_MAPPING,
  DEMO_IMPORT_ROWS,
  assertDemoSampleRows,
  demoImportCsv,
  demoImportId,
  normalizedDemoRow,
} from "@/lib/imports/demo-sample";
import { parseImportFile } from "@/lib/imports/parser";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  admin: vi.fn(),
  env: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext: mocks.context }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/config/env.server", () => ({ getServerEnv: mocks.env }));
vi.mock("@/lib/r2/objects", () => ({ deleteDocumentObject: mocks.deleteObject }));
import { POST } from "@/app/api/imports/demo/route";
import { POST as parseUpload } from "@/app/api/imports/parse/route";
import { POST as execute } from "@/app/api/imports/[jobId]/execute/route";
import { POST as validate } from "@/app/api/imports/[jobId]/validate/route";
import { POST as resolve } from "@/app/api/imports/[jobId]/resolve/route";
import { PATCH as edit } from "@/app/api/imports/[jobId]/rows/[rowId]/route";
import { GET as errorReport } from "@/app/api/imports/[jobId]/error-report/route";
import { GET as downloadSample } from "@/app/api/imports/demo/sample/route";
import { resetDemoWorkspace } from "@/lib/demo/reset";
import { canUseDemoImport } from "@/lib/imports/demo";

// In-memory Data API adapter: the actual parser, validation, duplicate resolver,
// execution, row persistence, and reset coordinator all run in these tests.
type RecordRow = Record<string, any>;
class Database {
  tables: Record<string, RecordRow[]> = {};
  from(table: string) {
    this.tables[table] ??= [];
    return new Query(this, table);
  }
  rpc = vi.fn(async (name: string) => {
    expect(name).toBe("reset_note_it_demo_workspace");
    for (const table of ["customers", "companies", "documents", "import_jobs", "import_job_rows"])
      this.tables[table] = (this.tables[table] ?? []).filter(
        (row) => row.organization_id !== "demo-org",
      );
    this.seedDemo();
    return { data: { customers: 1, documents: 1 }, error: null };
  });
  seedDemo() {
    this.tables.customers ??= [];
    this.tables.documents ??= [];
    this.tables.customers.push({
      id: "ahmed",
      organization_id: "demo-org",
      full_name: "Ahmed Hassan",
      phone: "+971500002201",
    });
    this.tables.documents.push({
      id: "eid",
      organization_id: "demo-org",
      document_number: "DEMO-SR-EID-001",
    });
  }
}
class Query {
  filters: ((row: RecordRow) => boolean)[] = [];
  operation = "select";
  values: RecordRow[] = [];
  patch: RecordRow = {};
  singleRow = false;
  head = false;
  max = Infinity;
  sort = "";
  constructor(
    readonly db: Database,
    readonly table: string,
  ) {}
  select(_columns?: string, options?: { head?: boolean; count?: string }) {
    this.head = options?.head ?? false;
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  is(key: string, value: unknown) {
    return this.eq(key, value);
  }
  not(key: string, _operator: string, value: unknown) {
    this.filters.push((row) => row[key] !== value && row[key] !== undefined);
    return this;
  }
  ilike(key: string, value: string) {
    this.filters.push((row) => String(row[key]).toLowerCase() === value.toLowerCase());
    return this;
  }
  order(key: string) {
    this.sort = key;
    return this;
  }
  limit(amount: number) {
    this.max = amount;
    return this;
  }
  insert(values: RecordRow | RecordRow[]) {
    this.operation = "insert";
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }
  update(patch: RecordRow) {
    this.operation = "update";
    this.patch = patch;
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  maybeSingle() {
    this.singleRow = true;
    return this;
  }
  then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
    return Promise.resolve()
      .then(() => this.run())
      .then(resolve, reject);
  }
  run() {
    let rows = this.db.tables[this.table].filter((row) =>
      this.filters.every((filter) => filter(row)),
    );
    if (this.operation === "insert") {
      if (
        this.values.some(
          (row) => row.id && this.db.tables[this.table].some((existing) => existing.id === row.id),
        )
      )
        return { data: null, error: { code: "23505" } };
      rows = this.values.map((value) => ({
        id: randomUUID(),
        ...(this.table === "import_jobs"
          ? {
              processed_rows: 0,
              customers_created: 0,
              companies_created: 0,
              documents_created: 0,
              records_updated: 0,
              records_skipped: 0,
              records_failed: 0,
            }
          : {}),
        ...(this.table === "import_job_rows"
          ? { status: "ready", issues: [], normalized_data: {}, resolution: null }
          : {}),
        ...value,
      }));
      this.db.tables[this.table].push(...rows);
    } else if (this.operation === "update") rows.forEach((row) => Object.assign(row, this.patch));
    if (this.sort) rows.sort((a, b) => a[this.sort] - b[this.sort]);
    return {
      data: this.head ? null : this.singleRow ? (rows[0] ?? null) : rows.slice(0, this.max),
      count: rows.length,
      error: null,
    };
  }
}
let db: Database;
let context: WorkspaceContext;
const request = (action: string, extra = {}) =>
  new Request("https://note-it.test/api/imports/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
const run = async (action: string) => {
  const response = await POST(request(action));
  expect(response.status).toBe(200);
  return (await response.json()).sample;
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DEMO_ORGANIZATION_ID", "demo-org");
  db = new Database();
  db.seedDemo();
  db.tables.organizations = [
    { id: "demo-org", slug: "note-it-demo", status: "active", is_active: true },
  ];
  db.tables.organization_memberships = [
    { organization_id: "demo-org", is_primary_owner: true, status: "active" },
  ];
  db.tables.organization_document_types = [
    "Passport",
    "Emirates ID",
    "Residence Visa",
    "Trade Licence",
  ].map((name) => ({ id: randomUUID(), organization_id: "demo-org", name }));
  context = {
    organization: {
      id: "demo-org",
      slug: "note-it-demo",
      status: "active",
      is_active: true,
      location: "Dubai",
    },
    membership: { role: "owner", status: "active", organization_id: "demo-org" },
    user: { id: "demo-owner" },
    supabase: db,
  } as unknown as WorkspaceContext;
  mocks.context.mockResolvedValue(context);
  mocks.admin.mockReturnValue(db);
  mocks.env.mockReturnValue({ DEMO_ORGANIZATION_ID: "demo-org" });
});

describe("safe demo sample import", () => {
  it("parses the deployed fictional CSV with ten rows and only invalid-domain emails", async () => {
    const parsed = await parseImportFile(new File([demoImportCsv()], DEMO_IMPORT_FILE));
    expect(parsed.sheets[0].rows).toEqual(DEMO_IMPORT_ROWS);
    expect(parsed.sheets[0].rows).toHaveLength(10);
    expect(
      DEMO_IMPORT_ROWS.every(
        (row) => !row.customer_email || row.customer_email.endsWith("@sample.example.invalid"),
      ),
    ).toBe(true);
    expect(
      DEMO_IMPORT_ROWS.every((row) => row.notes.includes("Not a real person or document")),
    ).toBe(true);
  });
  it("runs the real pipeline, produces actual counts and visible organization-scoped records", async () => {
    await run("try");
    const reviewed = await run("validate");
    expect(reviewed.rows.filter((row: RecordRow) => row.status === "ready")).toHaveLength(8);
    expect(
      reviewed.rows.filter((row: RecordRow) => row.status === "possible_duplicate"),
    ).toHaveLength(1);
    expect(reviewed.rows.filter((row: RecordRow) => row.status === "invalid")).toHaveLength(1);
    expect((await POST(request("import"))).status).toBe(409);
    await run("skip");
    const imported = await run("import");
    expect(imported.job).toMatchObject({
      status: "completed",
      customers_created: 7,
      companies_created: 1,
      documents_created: 8,
      records_updated: 0,
      records_skipped: 2,
      records_failed: 0,
    });
    expect(db.tables.customers.find((row) => row.full_name === "Amina Rahman")).toMatchObject({
      organization_id: "demo-org",
      phone: "+971500001201",
    });
    expect(
      db.tables.documents.find((row) => row.document_number === "DEMO-IMPORT-P-001"),
    ).toMatchObject({ organization_id: "demo-org", expires_on: "2028-08-16" });
    expect(db.tables.customers.find((row) => row.full_name === "John Mathew")?.company_id).toBe(
      db.tables.companies[0].id,
    );
    expect(db.tables.customers.filter((row) => row.full_name === "Ahmed Hassan")).toHaveLength(1);
  });
  it("returns the same completed job on repeat without inflating records", async () => {
    await run("try");
    await run("validate");
    await run("skip");
    const first = await run("import");
    const counts = [
      db.tables.customers.length,
      db.tables.companies.length,
      db.tables.documents.length,
    ];
    expect((await run("try")).job.id).toBe(first.job.id);
    expect((await run("import")).job.id).toBe(first.job.id);
    expect(db.tables.import_jobs).toHaveLength(1);
    expect([
      db.tables.customers.length,
      db.tables.companies.length,
      db.tables.documents.length,
    ]).toEqual(counts);
  });
  it("claims execution once for concurrent visitors", async () => {
    await run("try");
    await run("validate");
    await run("skip");
    const responses = await Promise.all([POST(request("import")), POST(request("import"))]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(db.tables.customers.filter((row) => row.full_name === "Amina Rahman")).toHaveLength(1);
  });
  it("uses the existing reset, clears sample records/history and leaves another organization untouched", async () => {
    await run("try");
    await run("validate");
    await run("skip");
    await run("import");
    db.tables.customers.push({
      id: "private-customer",
      organization_id: "private-org",
      full_name: "Private Customer",
    });
    expect(await run("reset")).toBeNull();
    expect(db.rpc).toHaveBeenCalledOnce();
    expect(db.tables.import_jobs).toHaveLength(0);
    expect(db.tables.import_job_rows).toHaveLength(0);
    expect(db.tables.customers.some((row) => row.full_name === "Amina Rahman")).toBe(false);
    expect(db.tables.companies).toHaveLength(0);
    expect(db.tables.documents.some((row) => row.document_number.startsWith("DEMO-IMPORT"))).toBe(
      false,
    );
    expect(db.tables.customers.some((row) => row.id === "private-customer")).toBe(true);
    expect((await run("try")).job.total_rows).toBe(10);
  });
  it.each(["organization_id", "file", "rows", "mapping", "jobId"])(
    "rejects browser-supplied %s",
    async (key) => {
      expect((await POST(request("try", { [key]: "arbitrary" }))).status).toBe(400);
      expect(db.tables.import_jobs ?? []).toHaveLength(0);
    },
  );
  it("rejects multipart uploads without storing them", async () => {
    const form = new FormData();
    form.set("file", new File(["PII"], "private.csv"));
    expect(
      (
        await POST(
          new Request("https://note-it.test/api/imports/demo", { method: "POST", body: form }),
        )
      ).status,
    ).toBe(400);
    expect(db.tables.import_jobs ?? []).toHaveLength(0);
  });
  it("blocks source and normalized-data tampering", async () => {
    await run("try");
    const row = db.tables.import_job_rows[0];
    row.source_data = { ...row.source_data, customer_name: "Visitor data" };
    expect((await POST(request("validate"))).status).toBe(400);
    row.source_data = DEMO_IMPORT_ROWS[0];
    await run("validate");
    row.normalized_data = { ...row.normalized_data, customer_email: "real@example.com" };
    expect((await POST(request("skip"))).status).toBe(400);
    expect(db.tables.customers).toHaveLength(1);
  });
  it("requires the known active Demo organization and active membership", () => {
    expect(canUseDemoImport(context)).toBe(true);
    expect(
      canUseDemoImport({
        ...context,
        organization: { ...context.organization, id: "private-org" },
      }),
    ).toBe(false);
    expect(
      canUseDemoImport({
        ...context,
        membership: { ...context.membership, organization_id: "private-org" },
      }),
    ).toBe(false);
    expect(
      canUseDemoImport({ ...context, organization: { ...context.organization, is_active: false } }),
    ).toBe(false);
    vi.stubEnv("DEMO_ORGANIZATION_ID", "");
    expect(canUseDemoImport(context)).toBe(false);
  });
  it("keeps all normal import mutation routes blocked in Demo Mode", async () => {
    const params = Promise.resolve({ jobId: "arbitrary", rowId: "arbitrary" });
    for (const handler of [parseUpload, execute, validate, resolve, edit])
      expect((await handler(request("try"), { params })).status).toBe(403);
    expect(db.tables.import_jobs ?? []).toHaveLength(0);
  });
  it.each(["owner", "admin"])("retains the real CSV importer for a normal %s", async (role) => {
    context.organization.id = "private-org";
    context.organization.slug = "private";
    context.membership.role = role;
    context.membership.organization_id = "private-org";
    const form = new FormData();
    form.set("file", new File([demoImportCsv()], "private.csv"));
    const response = await parseUpload(
      new Request("https://note-it.test/api/imports/parse", { method: "POST", body: form }),
    );
    expect(response.status).toBe(200);
    const jobId = (await response.json()).jobId;
    expect(
      (
        await validate(
          new Request("https://note-it.test/validate", {
            method: "POST",
            body: JSON.stringify({ sheetName: "CSV", mapping: DEMO_IMPORT_MAPPING }),
          }),
          { params: Promise.resolve({ jobId }) },
        )
      ).status,
    ).toBe(200);
    expect(db.tables.import_jobs[0]).toMatchObject({
      organization_id: "private-org",
      file_name: "private.csv",
    });
    expect((await POST(request("try"))).status).toBe(403);
  });
  it("blocks normal members from both sample and private upload routes", async () => {
    context.organization.id = "private-org";
    context.membership.role = "member";
    expect((await POST(request("try"))).status).toBe(403);
    expect((await parseUpload(request("try"))).status).toBe(403);
  });
  it("does not accept a look-alike sample job with missing or extra rows", () => {
    const rows = DEMO_IMPORT_ROWS.map((source_data, index) => ({
      id: demoImportId("demo-org", `row-${index}`),
      row_number: index + 2,
      source_sheet_name: "CSV",
      source_data,
      normalized_data: normalizedDemoRow(index),
      status: index === 8 ? "possible_duplicate" : index === 9 ? "invalid" : "ready",
      resolution: index < 8 ? "create" : null,
    }));
    expect(() => assertDemoSampleRows(rows, "demo-org", true)).not.toThrow();
    expect(() => assertDemoSampleRows(rows.slice(0, 9), "demo-org")).toThrow();
    expect(() => assertDemoSampleRows([...rows, rows[0]], "demo-org")).toThrow();
  });
});

describe("sample download, history and reset guards", () => {
  it("serves the fictional CSV from the application", async () => {
    const response = downloadSample();
    expect(response.headers.get("content-disposition")).toContain(DEMO_IMPORT_FILE);
    expect(await response.text()).toBe(demoImportCsv());
  });
  it("returns only the canonical sample error report in Demo Mode", async () => {
    await run("try");
    await run("validate");
    await run("skip");
    const jobId = demoImportId("demo-org");
    const response = await errorReport(request("try"), { params: Promise.resolve({ jobId }) });
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("Tariq Sample");
    expect(csv).toContain("ambiguous");
    expect(
      (await errorReport(request("try"), { params: Promise.resolve({ jobId: "another-job" }) }))
        .status,
    ).toBe(404);
  });
  it("refuses a reset if the active demo does not match the expected server identity", async () => {
    await expect(resetDemoWorkspace("private-org")).rejects.toThrow("Demo reset failed");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
