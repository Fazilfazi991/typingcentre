// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartUploadForm } from "@/features/documents/smart-upload-form";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  upload: vi.fn(),
  finalize: vi.fn(),
  extract: vi.fn(),
  abandon: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/documents/actions", () => ({
  createDocumentUploadSession: mocks.create,
  finalizeDocumentUpload: mocks.finalize,
  extractUploadedDocument: mocks.extract,
  abandonDocumentUpload: mocks.abandon,
  confirmDocumentExtraction: mocks.confirm,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

const props = { customerId: "customer-1", customerName: "Aisha Ali", documentTypes: [{ id: "passport", name: "Passport" }] };

describe("SmartUploadForm", () => {
  it("starts upload immediately after a supported file is selected and reaches review", async () => {
    mocks.create.mockResolvedValue({ ok: true, data: { documentId: "document-1", versionId: "version-1", uploadUrl: "https://upload.test/file", contentType: "application/pdf" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    mocks.finalize.mockResolvedValue({ ok: true });
    mocks.extract.mockResolvedValue({ ok: true, data: { extraction: { document_type: "passport", document_name: "Passport", document_number: null, subject_type: "person", subject_name: "Aisha Ali", issue_date: null, expiry_date: null, date_of_birth: null, nationality: null, issuing_authority: null, secondary_identifiers: [], additional_fields: {}, confidence: { document_type: "high", document_number: "low", issue_date: "low", expiry_date: "low", subject_name: "high" }, warnings: [] } } });

    render(<SmartUploadForm {...props} />);
    const input = screen.getByLabelText(/choose a file/i);
    fireEvent.change(input, { target: { files: [new File(["sample"], "sample.pdf", { type: "application/pdf" })] } });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: /ready for review/i })).toBeTruthy();
  });

  it("does not offer file selection when uploads are disabled", () => {
    render(<SmartUploadForm {...props} uploadDisabledReason="Uploads are unavailable in this workspace." />);
    expect(screen.getByRole("status").textContent).toMatch(/unavailable/i);
    expect(screen.queryByLabelText(/choose a file/i)).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
