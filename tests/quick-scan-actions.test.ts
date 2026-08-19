import { beforeEach, describe, expect, it, vi } from "vitest";

const id = "11111111-1111-4111-8111-111111111111";
const typeId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  scan: null as Record<string, unknown> | null,
  types: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ table: string; value: Record<string, unknown> }>,
  inspect: vi.fn(),
  read: vi.fn(),
  classify: vi.fn(),
  extract: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/r2/objects", () => ({
  inspectDocumentObject: mocks.inspect,
  readDocumentObject: mocks.read,
  createDocumentUploadUrl: vi.fn(),
}));
vi.mock("@/lib/document-ai/gemini", () => ({
  GeminiDocumentExtractor: class {
    classifyDocument = mocks.classify;
  },
}));
vi.mock("@/lib/document-ai/extract-document", () => ({ extractDocument: mocks.extract }));
vi.mock("@/lib/workspace/context", () => ({
  getWorkspaceContext: vi.fn(async () => ({
    organization: { id: "org-a" },
    supabase: {
      from(table: string) {
        const result = {
          data: table === "organization_document_types" ? mocks.types : mocks.scan,
          error: null,
        };
        const query: Record<string, unknown> = {
          eq: () => query,
          is: () => query,
          maybeSingle: async () =>
            table === "organization_document_types"
              ? { data: mocks.types[0] ?? null, error: null }
              : { data: mocks.scan, error: null },
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
        return {
          select: () => query,
          update(value: Record<string, unknown>) {
            mocks.updates.push({ table, value });
            return query;
          },
        };
      },
      rpc: mocks.rpc,
    },
  })),
}));

import {
  classifyPendingScan,
  resolvePendingScanType,
  verifyPendingScanUpload,
} from "@/app/scan/actions";

function scan(overrides: Record<string, unknown> = {}) {
  return {
    id,
    object_key: "organizations/org-a/pending-scans/file.pdf",
    mime_type: "application/pdf",
    expected_size_bytes: 12,
    state: "classifying",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.scan = scan();
  mocks.types = [{ id: typeId, name: "Passport", canonical_code: "passport" }];
  mocks.updates = [];
  mocks.inspect
    .mockReset()
    .mockResolvedValue({ ContentLength: 12, ContentType: "application/pdf" });
  mocks.read.mockReset().mockResolvedValue(Buffer.from("safe test document"));
  mocks.classify.mockReset().mockResolvedValue({ canonicalCode: "passport" });
  mocks.extract.mockReset().mockResolvedValue({ extraction: { document_type: "passport", document_name: "Demo Passport", document_number: null, subject_type: "person", subject_name: null, issue_date: null, expiry_date: null, date_of_birth: null, nationality: null, issuing_authority: null, secondary_identifiers: [], additional_fields: {}, confidence: { document_type: "low", document_number: "low", issue_date: "low", expiry_date: "low", subject_name: "low" }, warnings: [] } });
  mocks.rpc.mockReset().mockResolvedValue({ data: [{ document_id: "44444444-4444-4444-8444-444444444444", version_id: "55555555-5555-4555-8555-555555555555", already_finalized: false }], error: null });
});

describe("verifyPendingScanUpload", () => {
  it("uses the stored private key and transitions a same-tenant uploaded scan without creating final records", async () => {
    mocks.scan = scan({ state: "uploaded" });
    await expect(verifyPendingScanUpload(id)).resolves.toMatchObject({ ok: true });
    expect(mocks.inspect).toHaveBeenCalledWith("organizations/org-a/pending-scans/file.pdf");
    expect(mocks.updates).toEqual([{ table: "pending_scans", value: { state: "classifying" } }]);
  });

  it("rejects absent/cross-tenant, confirmed, and mismatched uploads", async () => {
    mocks.scan = null;
    await expect(verifyPendingScanUpload(id)).resolves.toMatchObject({ ok: false });
    expect(mocks.inspect).not.toHaveBeenCalled();
    mocks.scan = scan({ state: "confirmed" });
    await expect(verifyPendingScanUpload(id)).resolves.toMatchObject({ ok: false });
    mocks.scan = scan({ state: "uploaded" });
    mocks.inspect.mockResolvedValueOnce({ ContentLength: 13, ContentType: "image/png" });
    await expect(verifyPendingScanUpload(id)).resolves.toMatchObject({ ok: false });
    expect(mocks.updates).toEqual([]);
  });
});

describe("classifyPendingScan", () => {
  it("reads the stored pending object and resolves exactly one same-tenant canonical mapping", async () => {
    await expect(classifyPendingScan(id)).resolves.toMatchObject({
      ok: true,
      data: { status: "resolved", tenantDocumentTypeId: typeId },
    });
    expect(mocks.read).toHaveBeenCalledWith("organizations/org-a/pending-scans/file.pdf");
    expect(mocks.updates).toEqual([
      {
        table: "pending_scans",
        value: {
          state: "classified",
          detected_canonical_code: "passport",
          detected_document_type_id: typeId,
        },
      },
    ]);
  });

  it("rejects cross-tenant/missing and wrong-state scans before reading their objects", async () => {
    mocks.scan = null;
    await expect(classifyPendingScan(id)).resolves.toMatchObject({ ok: false });
    expect(mocks.read).not.toHaveBeenCalled();
    mocks.scan = scan({ state: "uploaded" });
    await expect(classifyPendingScan(id)).resolves.toMatchObject({ ok: false });
  });

  it.each([
    [
      "no mapping",
      [] as Array<Record<string, unknown>>,
      { canonicalCode: "passport" },
      "no_mapping",
    ],
    [
      "duplicate mapping",
      [{ id: typeId }, { id: "33333333-3333-4333-8333-333333333333" }],
      { canonicalCode: "passport" },
      "duplicate_mapping",
    ],
    ["unresolved classifier", [{ id: typeId }], { canonicalCode: null }, "unresolved"],
  ])("uses manual fallback for %s", async (_name, types, classification, reason) => {
    mocks.types = types;
    mocks.classify.mockResolvedValueOnce(classification);
    await expect(classifyPendingScan(id)).resolves.toMatchObject({
      ok: true,
      data: { status: "manual_required", reason },
    });
    expect(mocks.updates[0]).toEqual({
      table: "pending_scans",
      value: { state: "classification_failed" },
    });
  });

  it("uses manual fallback when the classifier provider fails", async () => {
    mocks.classify.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(classifyPendingScan(id)).resolves.toMatchObject({
      ok: true,
      data: { status: "manual_required", reason: "provider_error" },
    });
  });
});

describe("resolvePendingScanType", () => {
  it("persists a same-tenant active manual type without creating final records", async () => {
    await expect(
      resolvePendingScanType({ pendingScanId: id, documentTypeId: typeId }),
    ).resolves.toMatchObject({ ok: true, data: { resolutionSource: "manual" } });
    expect(mocks.updates).toEqual([
      {
        table: "pending_scans",
        value: {
          state: "classified",
          detected_document_type_id: typeId,
          detected_canonical_code: "passport",
        },
      },
    ]);
  });

  it("rejects unavailable/inactive types and confirmed scans", async () => {
    mocks.types = [];
    await expect(
      resolvePendingScanType({ pendingScanId: id, documentTypeId: typeId }),
    ).resolves.toMatchObject({ ok: false });
    mocks.scan = scan({ state: "confirmed" });
    await expect(
      resolvePendingScanType({ pendingScanId: id, documentTypeId: typeId }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.updates).toEqual([]);
  });
});

describe("Stage 3 pending scan actions", () => {
  it("uses the stored private pending object for extraction and never accepts a browser type", async () => {
    const { extractPendingScan } = await import("@/app/scan/actions");
    mocks.scan = scan({ state: "classified", detected_document_type_id: typeId, extraction_data: null });
    await expect(extractPendingScan(id)).resolves.toMatchObject({ ok: true, data: { cached: false } });
    expect(mocks.read).toHaveBeenCalledWith("organizations/org-a/pending-scans/file.pdf");
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect(mocks.updates).toContainEqual({ table: "pending_scans", value: expect.objectContaining({ extraction_data: expect.anything() }) });
  });

  it("rejects unresolved or cross-tenant pending scans before reading R2", async () => {
    const { extractPendingScan } = await import("@/app/scan/actions");
    mocks.scan = scan({ state: "uploaded" });
    await expect(extractPendingScan(id)).resolves.toMatchObject({ ok: false });
    expect(mocks.read).not.toHaveBeenCalled();
    mocks.scan = null;
    await expect(extractPendingScan(id)).resolves.toMatchObject({ ok: false });
  });
});
