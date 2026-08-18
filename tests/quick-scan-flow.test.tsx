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
  upload: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/app/scan/actions", () => ({
  createPendingScanUpload: mocks.create,
  verifyPendingScanUpload: mocks.verify,
  classifyPendingScan: mocks.classify,
  resolvePendingScanType: mocks.resolve,
  createQuickScanCustomer: vi.fn(),
}));
vi.mock("@/features/documents/smart-upload-form", () => ({ uploadDocumentBinary: mocks.upload }));

import { QuickScanFlow } from "@/app/scan/quick-scan-flow";

function renderFlow() {
  return render(
    <QuickScanFlow
      customers={[{ id: customerId, full_name: "Demo Customer", phone: "0500000000" }]}
      companies={[]}
      documentTypes={[
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
  await user.click(screen.getByRole("button", { name: /Demo Customer/ }));
  await user.click(screen.getByRole("button", { name: "Continue to camera" }));
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["safe"], "passport.pdf", { type: "application/pdf" })] },
  });
  await user.click(screen.getByRole("button", { name: "Process document" }));
}

beforeEach(() => {
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
    expect(await screen.findByText("Document type ready")).toBeTruthy();
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
    expect(await screen.findByText("Document type ready")).toBeTruthy();
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
    expect(await screen.findByRole("heading", { name: "Driving Licence" })).toBeTruthy();

    releaseClassification();
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith({ pendingScanId, documentTypeId: drivingLicenceId }));
    expect(screen.getByText("Document type ready")).toBeTruthy();
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
    await user.click(screen.getByRole("button", { name: /Demo Customer/ }));
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
