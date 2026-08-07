export const DOCUMENT_MIME_TYPES = {
  "application/pdf": { extension: "pdf", label: "PDF" },
  "image/jpeg": { extension: "jpg", label: "JPEG image" },
  "image/png": { extension: "png", label: "PNG image" },
  "image/webp": { extension: "webp", label: "WebP image" },
} as const;

export const DEFAULT_MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_TYPE_OPTIONS = {
  customer: [
    "passport",
    "uae_visa",
    "emirates_id",
    "health_insurance",
    "labour_card",
    "work_permit",
    "driving_licence",
    "other",
  ],
  company: [
    "trade_licence",
    "establishment_card",
    "immigration_card",
    "vat_certificate",
    "corporate_tax_certificate",
    "tenancy_contract",
    "insurance",
    "municipality_approval",
    "other",
  ],
} as const;
