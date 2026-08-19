// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const customerId = "11111111-1111-4111-8111-111111111111";
const pendingScanId = "33333333-3333-4333-8333-333333333333";
const documentTypeId = "22222222-2222-4222-8222-222222222222";
const drivingLicenceId = "44444444-4444-4444-8444-444444444444";
const tradeLicenceId = "55555555-5555-4555-8555-555555555555";
const visitVisaId = "66666666-6666-4666-8666-666666666666";
const medicalInsuranceId = "77777777-7777-4777-8777-777777777777";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  verify: vi.fn(),
  classify: vi.fn(),
  resolve: vi.fn(),
  extract: vi.fn(),
  finalize: vi.fn(),
  upload: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/app/scan/actions", () => ({
  createPendingScanUpload: mocks.create,
  verifyPendingScanUpload: mocks.verify,
  classifyPendingScan: mocks.classify,
  resolvePendingScanType: mocks.resolve,
  extractPendingScan: mocks.extract,
  finalizePendingScan: mocks.finalize,
  createQuickScanCustomer: vi.fn(),
}));
vi.mock("@/features/documents/smart-upload-form", () => ({ uploadDocumentBinary: mocks.upload }));

import { QuickScanFlow } from "@/app/scan/quick-scan-flow";

function renderFlow() {
  return render(
    <QuickScanFlow documentTypes={[
        { id: documentTypeId, name: "Passport" },
        { id: drivingLicenceId, name: "Driving Licence" },
        { id: tradeLicenceId, name: "Trade Licence" },
        { id: visitVisaId, name: "Visit Visa" },
        { id: medicalInsuranceId, name: "Medical Insurance" },
      ]}
    />,
  );
}

async function chooseOwnerAndFile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Select a customer" }));
  await user.type(screen.getByRole("textbox", { name: "Search customer" }), "Demo");
  await user.click(await screen.findByRole("option", { name: /Demo Customer/ }));
  await user.click(screen.getByRole("button", { name: "Continue to camera" }));
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["safe"], "passport.pdf", { type: "application/pdf" })] },
  });
  await user.click(screen.getByRole("button", { name: "Process document" }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ results: [{ id: customerId, label: "Demo Customer", description: "0500000000" }] }) }));
  mocks.create.mockReset().mockResolvedValue({
    ok: true,
    data: { pendingScanId, uploadUrl: "https://upload.example/test" },
  });
  mocks.upload.mockReset().mockResolvedValue({ ok: true });
  mocks.verify.mockReset().mockResolvedValue({ ok: true, data: { pendingScanId } });
  mocks.classify.mockReset().mockResolvedValue({
    ok: true,
    data: { status: "resolved", tenantDocumentTypeId: documentTypeId, displayName: "Passport" },
  });
  mocks.resolve.mockReset().mockResolvedValue({
    ok: true,
    data: {
      tenantDocumentTypeId: documentTypeId,
      displayName: "Passport",
      resolutionSource: "manual",
    },
  });
  mocks.extract.mockReset().mockImplementation(() => new Promise(() => {}));
  mocks.finalize.mockReset();
  mocks.push.mockReset();
  mocks.refresh.mockReset();
});

const extraction = {
  document_type: "passport", document_name: "Demo Passport", document_number: "P-12345",
  subject_type: "person", subject_name: "Demo Customer", issue_date: "2025-08-01", expiry_date: "2026-08-20",
  date_of_birth: "1990-01-01", nationality: "Demo", issuing_authority: "Demo Authority",
  secondary_identifiers: [{ label: "File", value: "A1" }], additional_fields: { sponsor: "Demo Co" },
  confidence: { document_type: "high", document_number: "high", issue_date: "high", expiry_date: "high", subject_name: "high" }, warnings: [],
};

describe("Quick Scan Stage 3 client orchestration", () => {
  async function reachReview(user: ReturnType<typeof userEvent.setup>) {
    mocks.extract.mockResolvedValueOnce({ ok: true, data: { extraction, cached: false } });
    renderFlow();
    await chooseOwnerAndFile(user);
    await screen.findByText("Detected document");
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Passport" });
  }

  it("automatically extracts, allows edits, saves once, and exposes canonical routes", async () => {
    const user = userEvent.setup();
    mocks.finalize.mockResolvedValueOnce({ ok: true, data: { documentId: "88888888-8888-4888-8888-888888888888", customerId, companyId: null } });
    await reachReview(user);
    expect(mocks.extract).toHaveBeenCalledWith(pendingScanId);
    const number = screen.getByLabelText("Document number");
    await user.clear(number); await user.type(number, "P-CORRECTED");
    const expiry = screen.getByLabelText("Expiry date");
    await user.clear(expiry); await user.type(expiry, "2026-08-22");
    await user.click(screen.getByRole("button", { name: "Confirm & Save" }));
    await screen.findByText("Document saved");
    expect(mocks.finalize).toHaveBeenCalledTimes(1);
    expect(mocks.finalize.mock.calls[0][0]).toMatchObject({ pendingScanId, documentNumber: "P-CORRECTED", expiryDate: "2026-08-22" });
    await user.click(screen.getByRole("button", { name: "View document" }));
    expect(mocks.push).toHaveBeenCalledWith("/documents/88888888-8888-4888-8888-888888888888");
    await user.click(screen.getByRole("button", { name: "View customer" }));
    expect(mocks.push).toHaveBeenCalledWith(`/customers/${customerId}`);
  });

  it("keeps the pending scan when extraction fails and supports manual review recovery", async () => {
    const user = userEvent.setup();
    mocks.extract.mockResolvedValueOnce({ ok: false, message: "We couldn't read all the details." });
    renderFlow();
    await chooseOwnerAndFile(user);
    await screen.findByText("Detected document");
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "We couldn't read all the details." });
    await user.click(screen.getByRole("button", { name: "Enter details manually" }));
    expect(await screen.findByText("Review document")).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Quick Scan Stage 2 client orchestration", () => {
  it("shows verification then classification and reaches detected → type_resolved without final-save actions", async () => {
    const user = userEvent.setup();
    let releaseVerification!: () => void;
    let releaseClassification!: () => void;
    mocks.verify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseVerification = () => resolve({ ok: true, data: { pendingScanId } });
        }),
    );
    mocks.classify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseClassification = () =>
            resolve({
              ok: true,
              data: {
                status: "resolved",
                tenantDocumentTypeId: documentTypeId,
                displayName: "Passport",
              },
            });
        }),
    );
    renderFlow();
    await chooseOwnerAndFile(user);

    expect(await screen.findByRole("heading", { name: "Checking upload…" })).toBeTruthy();
    expect(mocks.verify).toHaveBeenCalledWith(pendingScanId);
    releaseVerification();
    expect(await screen.findByRole("heading", { name: "Identifying document…" })).toBeTruthy();
    expect(mocks.classify).toHaveBeenCalledWith(pendingScanId);
    releaseClassification();
    expect(await screen.findByText("Detected document")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Passport" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Reading document…" })).toBeTruthy();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("uses the same pending scan for a searchable manual override without re-uploading or reclassifying", async () => {
    const user = userEvent.setup();
    mocks.classify.mockResolvedValueOnce({
      ok: true,
      data: { status: "manual_required", reason: "unresolved" },
    });
    renderFlow();
    await chooseOwnerAndFile(user);

    expect(
      await screen.findByText("We could not identify this document. Choose its type to continue."),
    ).toBeTruthy();
    await user.type(screen.getByPlaceholderText("Search types"), "pass");
    await user.click(screen.getByRole("option", { name: "Passport" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mocks.resolve).toHaveBeenCalledWith({ pendingScanId, documentTypeId }),
    );
    expect(await screen.findByRole("heading", { name: "Reading document…" })).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.classify).toHaveBeenCalledTimes(1);
  });

  it("offers manual selection during classification and keeps it when a late AI result arrives", async () => {
    const user = userEvent.setup();
    let releaseClassification!: () => void;
    mocks.classify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseClassification = () =>
            resolve({
              ok: true,
              data: {
                status: "resolved",
                tenantDocumentTypeId: documentTypeId,
                displayName: "Passport",
              },
            });
        }),
    );
    mocks.resolve.mockResolvedValueOnce({
      ok: true,
      data: {
        tenantDocumentTypeId: drivingLicenceId,
        displayName: "Driving Licence",
        resolutionSource: "manual",
      },
    });
    renderFlow();
    await chooseOwnerAndFile(user);

    expect(await screen.findByRole("button", { name: "Choose type manually" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Choose type manually" }));
    await user.type(screen.getByPlaceholderText("Search types"), "lice");
    await user.click(screen.getByRole("option", { name: "Driving Licence" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Reading document…" })).toBeTruthy();

    releaseClassification();
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith({ pendingScanId, documentTypeId: drivingLicenceId }));
    expect(screen.getByRole("heading", { name: "Reading document…" })).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it("filters the tenant-provided picker options with one searchable control", async () => {
    const user = userEvent.setup();
    mocks.classify.mockResolvedValueOnce({
      ok: true,
      data: { status: "manual_required", reason: "unresolved" },
    });
    renderFlow();
    await chooseOwnerAndFile(user);
    const search = await screen.findByPlaceholderText("Search types");

    await user.type(search, "lice");
    expect(screen.getByRole("option", { name: "Driving Licence" })).toBeTruthy();
    await user.clear(search);
    await user.type(search, "trade");
    expect(screen.getByRole("option", { name: "Trade Licence" })).toBeTruthy();
    await user.clear(search);
    await user.type(search, "visa");
    expect(screen.getByRole("option", { name: "Visit Visa" })).toBeTruthy();
    await user.clear(search);
    await user.type(search, "insurance");
    expect(screen.getByRole("option", { name: "Medical Insurance" })).toBeTruthy();
  });

  it("shows the non-blocking timeout message while classification is still running", async () => {
    const user = userEvent.setup();
    mocks.classify.mockImplementationOnce(() => new Promise(() => {}));
    renderFlow();
    await user.click(screen.getByRole("button", { name: "Select a customer" }));
    await user.type(screen.getByRole("textbox", { name: "Search customer" }), "Demo");
    await user.click(await screen.findByRole("option", { name: /Demo Customer/ }));
    await user.click(screen.getByRole("button", { name: "Continue to camera" }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["safe"], "licence.pdf", { type: "application/pdf" })] },
    });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Process document" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "Identifying document…" })).toBeTruthy();
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Still working…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose type manually" })).toBeTruthy();
  });
});
