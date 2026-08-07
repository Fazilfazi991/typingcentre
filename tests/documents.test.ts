import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_DOCUMENT_SIZE_BYTES } from "@/features/documents/constants";
import {
  createDocumentObjectKey,
  documentExpiryState,
  documentUploadSessionSchema,
  normalizeOriginalFilename,
  validateDocumentFileMetadata,
} from "@/features/documents/validation";
import { documentExtractionSchema } from "@/lib/document-ai/schema";

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

describe("document AI extraction validation", () => {
  const base = {
    document_type: "passport", document_name: "Passport", document_number: null,
    subject_type: "person", subject_name: null, issue_date: null, expiry_date: null,
    date_of_birth: null, nationality: null, issuing_authority: null, secondary_identifiers: [],
    additional_fields: { visa_file_number: "123" },
    confidence: { document_type: "high", document_number: "low", issue_date: "low", expiry_date: "low", subject_name: "medium" }, warnings: [],
  };
  it("accepts structured results without inventing null values and preserves additional fields", () => {
    const result = documentExtractionSchema.parse(base);
    expect(result.document_number).toBeNull();
    expect(result.additional_fields).toEqual({ visa_file_number: "123" });
  });
  it("maps unknown documents to other and rejects invalid dates", () => {
    expect(documentExtractionSchema.parse({ ...base, document_type: "other", document_name: "Insurance Certificate" }).document_type).toBe("other");
    expect(documentExtractionSchema.safeParse({ ...base, expiry_date: "12/31/2027" }).success).toBe(false);
  });
  it("requires an expiry-review warning when confidence is low", () => {
    const result = documentExtractionSchema.parse({ ...base, warnings: ["Expiry date needs review"] });
    expect(result.confidence.expiry_date).toBe("low");
    expect(result.warnings).toContain("Expiry date needs review");
  });
});
