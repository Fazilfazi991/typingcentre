import { z } from "zod";
import { DEFAULT_MAX_DOCUMENT_SIZE_BYTES, DOCUMENT_MIME_TYPES } from "./constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const acceptedMimeTypes = Object.keys(DOCUMENT_MIME_TYPES) as [
  keyof typeof DOCUMENT_MIME_TYPES,
  ...(keyof typeof DOCUMENT_MIME_TYPES)[],
];

export const documentUploadSessionSchema = z
  .object({
    documentId: optionalUuid,
    documentTypeId: z.string().uuid(),
    customerId: optionalUuid,
    companyId: optionalUuid,
    branchId: optionalUuid,
    displayName: z.string().trim().min(2).max(160),
    documentNumber: optionalText(120),
    issueDate: z.string().date().optional().or(z.literal("")),
    expiryDate: z.string().date().optional().or(z.literal("")),
    notes: optionalText(2000),
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.enum(acceptedMimeTypes),
    fileSizeBytes: z.coerce.number().int().positive().max(DEFAULT_MAX_DOCUMENT_SIZE_BYTES),
  })
  .superRefine((value, ctx) => {
    if (!value.documentId && !value.customerId && !value.companyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerId"],
        message: "Select a customer or company.",
      });
    }
    if (value.branchId && !value.companyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchId"],
        message: "Select a company before selecting a branch.",
      });
    }
    if (value.issueDate && value.expiryDate && value.issueDate >= value.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "Expiry date must be after the issue date.",
      });
    }
  });

export const documentVersionIdSchema = z.object({ versionId: z.string().uuid() });
export const documentSignedAccessSchema = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
  disposition: z.enum(["inline", "attachment"]),
});

export function normalizeOriginalFilename(value: string) {
  const basename = value.replace(/\\/g, "/").split("/").pop() ?? "document";
  const normalized = basename
    .replace(/[\u0000-\u001f<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, 180) || "document";
}

export function extensionForMimeType(mimeType: keyof typeof DOCUMENT_MIME_TYPES) {
  return DOCUMENT_MIME_TYPES[mimeType].extension;
}

export function createDocumentObjectKey(input: {
  organizationId: string;
  documentId: string;
  versionId: string;
  mimeType: keyof typeof DOCUMENT_MIME_TYPES;
  randomId: string;
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/versions/${input.versionId}/${input.randomId}.${extensionForMimeType(input.mimeType)}`;
}

export function validateDocumentFileMetadata(
  input: { originalFilename: string; mimeType: string; fileSizeBytes: number },
  maxBytes = DEFAULT_MAX_DOCUMENT_SIZE_BYTES,
) {
  const allowed = Object.hasOwn(DOCUMENT_MIME_TYPES, input.mimeType);
  const validSize =
    Number.isSafeInteger(input.fileSizeBytes) &&
    input.fileSizeBytes > 0 &&
    input.fileSizeBytes <= maxBytes;
  const filename = normalizeOriginalFilename(input.originalFilename);
  return {
    ok: allowed && validSize && filename !== "document",
    filename,
    error: !allowed
      ? "Choose a PDF, JPEG, PNG, or WebP file."
      : !validSize
        ? "The selected file is too large."
        : null,
  };
}

export function documentExpiryState(
  expiryDate: string | null | undefined,
  archivedAt: string | null | undefined,
  today = new Date(),
  warningDays = 30,
) {
  if (archivedAt) return "archived" as const;
  if (!expiryDate) return "no_expiry" as const;
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const startOfToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  if (expiry < startOfToday) return "expired" as const;
  const warningLimit = new Date(startOfToday);
  warningLimit.setUTCDate(warningLimit.getUTCDate() + warningDays);
  return expiry <= warningLimit ? ("expiring_soon" as const) : ("active" as const);
}
