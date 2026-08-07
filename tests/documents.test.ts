import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_DOCUMENT_SIZE_BYTES } from "@/features/documents/constants";
import {
  createDocumentObjectKey,
  documentExpiryState,
  documentUploadSessionSchema,
  normalizeOriginalFilename,
  validateDocumentFileMetadata,
} from "@/features/documents/validation";

const id = "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0";

describe("Stage 6 document validation", () => {
  it("requires valid document ownership and branch/company pairing", () => {
    expect(
      documentUploadSessionSchema.safeParse({
        documentTypeId: id,
        displayName: "Visa",
        originalFilename: "visa.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      }).success,
    ).toBe(false);
    expect(
      documentUploadSessionSchema.safeParse({
        documentTypeId: id,
        customerId: id,
        branchId: id,
        displayName: "Visa",
        originalFilename: "visa.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      }).success,
    ).toBe(false);
    expect(
      documentUploadSessionSchema.safeParse({
        documentTypeId: id,
        customerId: id,
        companyId: id,
        branchId: id,
        displayName: "Visa",
        originalFilename: "visa.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      }).success,
    ).toBe(true);
  });

  it("accepts only the initial safe file types and sizes", () => {
    expect(
      validateDocumentFileMetadata({
        originalFilename: "passport.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 100,
      }).ok,
    ).toBe(true);
    expect(
      validateDocumentFileMetadata({
        originalFilename: "payload.zip",
        mimeType: "application/zip",
        fileSizeBytes: 100,
      }).ok,
    ).toBe(false);
    expect(
      validateDocumentFileMetadata({
        originalFilename: "large.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: DEFAULT_MAX_DOCUMENT_SIZE_BYTES + 1,
      }).ok,
    ).toBe(false);
  });

  it("normalizes browser filenames without using them as object keys", () => {
    expect(normalizeOriginalFilename("C:\\fakepath\\passport<>.pdf")).toBe("passport--.pdf");
    const key = createDocumentObjectKey({
      organizationId: id,
      documentId: id,
      versionId: id,
      randomId: "f4f4f4f4-1111-4444-8888-121212121212",
      mimeType: "application/pdf",
    });
    expect(key).toBe(
      `organizations/${id}/documents/${id}/versions/${id}/f4f4f4f4-1111-4444-8888-121212121212.pdf`,
    );
    expect(key).not.toContain("passport");
  });

  it("derives expiry state without mutating the stored document status", () => {
    const today = new Date("2026-08-07T12:00:00.000Z");
    expect(documentExpiryState(null, null, today)).toBe("no_expiry");
    expect(documentExpiryState("2026-08-06", null, today)).toBe("expired");
    expect(documentExpiryState("2026-08-20", null, today)).toBe("expiring_soon");
    expect(documentExpiryState("2026-10-20", null, today)).toBe("active");
    expect(documentExpiryState("2026-10-20", "2026-08-07T00:00:00.000Z", today)).toBe("archived");
  });
});
