export const DOCUMENT_TYPE_VALUES = [
  "passport", "emirates_id", "visa", "trade_license", "establishment_card",
  "labour_card", "work_permit", "insurance", "vehicle_registration",
  "tenancy_document", "certificate", "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number];
export type Confidence = "high" | "medium" | "low";

export type DocumentExtraction = {
  document_type: DocumentType;
  document_name: string;
  document_number: string | null;
  subject_type: "person" | "company" | "unknown";
  subject_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  issuing_authority: string | null;
  secondary_identifiers: Array<{ label: string; value: string }>;
  additional_fields: Record<string, unknown>;
  confidence: Record<"document_type" | "document_number" | "issue_date" | "expiry_date" | "subject_name", Confidence>;
  warnings: string[];
};

export type ExtractDocumentInput = {
  bytes: Uint8Array;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  filename: string;
};

export interface DocumentExtractionProvider {
  readonly name: string;
  extract(input: ExtractDocumentInput): Promise<{ extraction: DocumentExtraction; model: string }>;
}
