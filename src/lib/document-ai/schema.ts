import { z } from "zod";
import { DOCUMENT_TYPE_VALUES } from "./types";

const isoDate = z.string().date();
const nullableDate = z.union([isoDate, z.null()]);
const confidence = z.enum(["high", "medium", "low"]);

export const documentExtractionSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPE_VALUES),
  document_name: z.string().trim().min(2).max(160),
  document_number: z.string().trim().max(120).nullable(),
  subject_type: z.enum(["person", "company", "unknown"]),
  subject_name: z.string().trim().max(240).nullable(),
  issue_date: nullableDate,
  expiry_date: nullableDate,
  date_of_birth: nullableDate,
  nationality: z.string().trim().max(120).nullable(),
  issuing_authority: z.string().trim().max(240).nullable(),
  secondary_identifiers: z.array(z.object({ label: z.string().trim().min(1).max(100), value: z.string().trim().min(1).max(160) })).max(20),
  additional_fields: z.record(z.unknown()),
  confidence: z.object({
    document_type: confidence,
    document_number: confidence,
    issue_date: confidence,
    expiry_date: confidence,
    subject_name: confidence,
  }),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20),
}).superRefine((value, ctx) => {
  if (value.issue_date && value.expiry_date && value.issue_date >= value.expiry_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiry_date"], message: "Expiry date must be after issue date." });
  }
});

export const documentExtractionJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    document_type: { type: "string", enum: DOCUMENT_TYPE_VALUES }, document_name: { type: "string" },
    document_number: { type: ["string", "null"] }, subject_type: { type: "string", enum: ["person", "company", "unknown"] },
    subject_name: { type: ["string", "null"] }, issue_date: { type: ["string", "null"] }, expiry_date: { type: ["string", "null"] },
    date_of_birth: { type: ["string", "null"] }, nationality: { type: ["string", "null"] }, issuing_authority: { type: ["string", "null"] },
    secondary_identifiers: { type: "array", items: { type: "object", additionalProperties: false, properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
    additional_fields: { type: "object" },
    confidence: { type: "object", additionalProperties: false, properties: { document_type: { type: "string", enum: ["high", "medium", "low"] }, document_number: { type: "string", enum: ["high", "medium", "low"] }, issue_date: { type: "string", enum: ["high", "medium", "low"] }, expiry_date: { type: "string", enum: ["high", "medium", "low"] }, subject_name: { type: "string", enum: ["high", "medium", "low"] } }, required: ["document_type", "document_number", "issue_date", "expiry_date", "subject_name"] },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["document_type", "document_name", "document_number", "subject_type", "subject_name", "issue_date", "expiry_date", "date_of_birth", "nationality", "issuing_authority", "secondary_identifiers", "additional_fields", "confidence", "warnings"],
};
