"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { safeDatabaseError } from "@/lib/workspace/utils";
import { createDocumentUploadUrl } from "@/lib/r2/objects";
import { inspectDocumentObject } from "@/lib/r2/objects";
import { readDocumentObject } from "@/lib/r2/objects";
import { GeminiDocumentExtractor } from "@/lib/document-ai/gemini";
import { extractDocument } from "@/lib/document-ai/extract-document";
import { documentExtractionSchema } from "@/lib/document-ai/schema";

const quickCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40),
});

function logScanClassificationOutcome(outcome: "tenant_mapping_missing" | "tenant_mapping_duplicate") {
  process.stdout.write(`${JSON.stringify({ event: "quick_scan_classification", outcome })}\n`);
}

export async function createQuickScanCustomer(input: unknown) {
  const parsed = quickCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Enter the customer's name and phone number." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };

  const { data, error } = await context.supabase.from("customers").insert({
    organization_id: context.organization.id,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
  }).select("id, full_name, phone").single();
  if (error || !data) return { ok: false as const, message: safeDatabaseError(error) };

  await context.supabase.rpc("log_workspace_activity", {
    event_kind: "customer_created",
    entity_type: "customer",
    entity_id: data.id,
  });
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true as const, data };
}

const pendingUploadSchema = z.object({
  customerId: z.string().uuid().optional(), companyId: z.string().uuid().optional(),
  originalFilename: z.string().trim().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
}).refine((value) => Boolean(value.customerId || value.companyId) && !(value.customerId && value.companyId), "Select one owner.");

export async function createPendingScanUpload(input: unknown) {
  const parsed = pendingUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Check the selected owner and file." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const ownerTable = parsed.data.customerId ? "customers" : "companies";
  const ownerId = parsed.data.customerId ?? parsed.data.companyId!;
  const { data: owner } = await context.supabase.from(ownerTable).select("id").eq("id", ownerId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle();
  if (!owner) return { ok: false as const, message: "The selected owner is unavailable." };
  const id = randomUUID(); const extension = parsed.data.mimeType === "application/pdf" ? "pdf" : parsed.data.mimeType.split("/")[1].replace("jpeg", "jpg");
  const objectKey = `organizations/${context.organization.id}/pending-scans/${id}/${randomUUID()}.${extension}`;
  const { error } = await context.supabase.from("pending_scans").insert({ id, organization_id: context.organization.id, customer_id: parsed.data.customerId ?? null, company_id: parsed.data.companyId ?? null, state: "uploaded", object_key: objectKey, original_filename: parsed.data.originalFilename, mime_type: parsed.data.mimeType, expected_size_bytes: parsed.data.fileSizeBytes, uploaded_at: new Date().toISOString() });
  if (error) return { ok: false as const, message: safeDatabaseError(error) };
  try { return { ok: true as const, data: { pendingScanId: id, uploadUrl: await createDocumentUploadUrl(objectKey, parsed.data.mimeType), objectKey } }; }
  catch { return { ok: false as const, message: "We could not prepare the private upload." }; }
}

export async function verifyPendingScanUpload(pendingScanId: string) {
  if (!z.string().uuid().safeParse(pendingScanId).success) return { ok: false as const, message: "The pending upload is unavailable." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const { data: scan } = await context.supabase.from("pending_scans").select("id,object_key,mime_type,expected_size_bytes,state").eq("id", pendingScanId).eq("organization_id", context.organization.id).maybeSingle();
  if (!scan?.object_key || !scan.mime_type || !scan.expected_size_bytes || scan.state === "confirmed") return { ok: false as const, message: "The pending upload is unavailable." };
  try {
    const object = await inspectDocumentObject(scan.object_key);
    if (object.ContentLength !== scan.expected_size_bytes || object.ContentType?.split(";", 1)[0] !== scan.mime_type) return { ok: false as const, message: "We couldn't verify the upload. Try again." };
    await context.supabase.from("pending_scans").update({ state: "classifying" }).eq("id", scan.id).eq("organization_id", context.organization.id);
    return { ok: true as const, data: { pendingScanId: scan.id } };
  } catch { return { ok: false as const, message: "We couldn't verify the upload. Try again." }; }
}

export async function classifyPendingScan(pendingScanId: string) {
  if (!z.string().uuid().safeParse(pendingScanId).success) return { ok: false as const, message: "The pending upload is unavailable." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const { data: scan } = await context.supabase.from("pending_scans").select("id,object_key,mime_type,state").eq("id", pendingScanId).eq("organization_id", context.organization.id).maybeSingle();
  if (!scan?.object_key || !scan.mime_type || scan.state !== "classifying") return { ok: false as const, message: "The pending upload is unavailable." };
  const fallback = async (reason: "unresolved" | "no_mapping" | "duplicate_mapping" | "provider_error") => { await context.supabase.from("pending_scans").update({ state: "classification_failed" }).eq("id", scan.id).eq("organization_id", context.organization.id).eq("state", "classifying"); return { ok: true as const, data: { status: "manual_required" as const, reason } }; };
  try {
    const result = await new GeminiDocumentExtractor().classifyDocument({ bytes: await readDocumentObject(scan.object_key), mimeType: scan.mime_type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp", filename: "pending-scan" });
    if (!result.canonicalCode) return fallback("unresolved");
    const { data: types } = await context.supabase.from("organization_document_types").select("id,name").eq("organization_id", context.organization.id).eq("canonical_code", result.canonicalCode).eq("is_active", true);
    if (!types?.length) {
      logScanClassificationOutcome("tenant_mapping_missing");
      return fallback("no_mapping");
    }
    if (types.length !== 1) {
      logScanClassificationOutcome("tenant_mapping_duplicate");
      return fallback("duplicate_mapping");
    }
    await context.supabase.from("pending_scans").update({ state: "classified", detected_canonical_code: result.canonicalCode, detected_document_type_id: types[0].id }).eq("id", scan.id).eq("organization_id", context.organization.id).eq("state", "classifying");
    return { ok: true as const, data: { status: "resolved" as const, canonicalCode: result.canonicalCode, tenantDocumentTypeId: types[0].id, displayName: types[0].name } };
  } catch { return fallback("provider_error"); }
}

export async function resolvePendingScanType(input: { pendingScanId: string; documentTypeId: string }) {
  if (!z.object({ pendingScanId: z.string().uuid(), documentTypeId: z.string().uuid() }).safeParse(input).success) return { ok: false as const, message: "Select an active document type." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const [{ data: scan }, { data: type }] = await Promise.all([
    context.supabase.from("pending_scans").select("id,state").eq("id", input.pendingScanId).eq("organization_id", context.organization.id).maybeSingle(),
    context.supabase.from("organization_document_types").select("id,name,canonical_code").eq("id", input.documentTypeId).eq("organization_id", context.organization.id).eq("is_active", true).maybeSingle(),
  ]);
  if (!scan || !type || scan.state === "confirmed") return { ok: false as const, message: "The selected document type is unavailable." };
  const { error } = await context.supabase.from("pending_scans").update({ state: "classified", detected_document_type_id: type.id, detected_canonical_code: type.canonical_code }).eq("id", scan.id).eq("organization_id", context.organization.id);
  if (error) return { ok: false as const, message: safeDatabaseError(error) };
  return { ok: true as const, data: { tenantDocumentTypeId: type.id, displayName: type.name, canonicalCode: type.canonical_code, resolutionSource: "manual" as const } };
}

const pendingScanIdSchema = z.string().uuid();
const pendingScanReviewSchema = z.object({
  pendingScanId: pendingScanIdSchema,
  displayName: z.string().trim().min(2).max(160),
  documentNumber: z.string().trim().max(120).optional().or(z.literal("")),
  issueDate: z.string().date().optional().or(z.literal("")),
  expiryDate: z.string().date().optional().or(z.literal("")),
  extractionData: documentExtractionSchema,
}).superRefine((value, ctx) => {
  if (value.issueDate && value.expiryDate && value.issueDate >= value.expiryDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiryDate"], message: "Expiry date must be after issue date." });
  }
});

export async function extractPendingScan(pendingScanId: string) {
  if (!pendingScanIdSchema.safeParse(pendingScanId).success) return { ok: false as const, message: "The pending scan is unavailable." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const { data: scan } = await context.supabase.from("pending_scans")
    .select("id,state,object_key,mime_type,detected_document_type_id,extraction_data")
    .eq("id", pendingScanId).eq("organization_id", context.organization.id).maybeSingle();
  if (!scan || scan.state !== "classified" || !scan.object_key || !scan.mime_type || !scan.detected_document_type_id) {
    return { ok: false as const, message: "Choose a document type before extracting details." };
  }
  const cached = documentExtractionSchema.safeParse(scan.extraction_data);
  if (cached.success) return { ok: true as const, data: { extraction: cached.data, cached: true } };
  try {
    const result = await extractDocument({
      bytes: await readDocumentObject(scan.object_key),
      mimeType: scan.mime_type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
      filename: "pending-scan",
    });
    await context.supabase.from("pending_scans").update({ extraction_data: result.extraction })
      .eq("id", scan.id).eq("organization_id", context.organization.id).eq("state", "classified");
    return { ok: true as const, data: { extraction: result.extraction, cached: false } };
  } catch {
    return { ok: false as const, message: "We couldn't read all the details." };
  }
}

export async function finalizePendingScan(input: unknown) {
  const parsed = pendingScanReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Review the document details and correct any invalid dates." };
  const context = await getWorkspaceContext();
  if (!context) return { ok: false as const, message: "Your session has expired. Please sign in again." };
  const { data, error } = await context.supabase.rpc("finalize_pending_scan", {
    target_pending_scan_id: parsed.data.pendingScanId,
    review_display_name: parsed.data.displayName,
    review_document_number: parsed.data.documentNumber || null,
    review_issue_date: parsed.data.issueDate || null,
    review_expiry_date: parsed.data.expiryDate || null,
    review_extraction_data: parsed.data.extractionData,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result?.document_id || !result?.version_id) return { ok: false as const, message: safeDatabaseError(error) || "We couldn't save this document. Try again." };
  const { data: scan } = await context.supabase.from("pending_scans").select("customer_id,company_id,detected_document_type_id")
    .eq("id", parsed.data.pendingScanId).eq("organization_id", context.organization.id).maybeSingle();
  revalidatePath("/dashboard"); revalidatePath("/documents"); revalidatePath("/renewals");
  if (scan?.customer_id) revalidatePath(`/customers/${scan.customer_id}`);
  if (scan?.company_id) revalidatePath(`/companies/${scan.company_id}`);
  return { ok: true as const, data: { documentId: result.document_id as string, versionId: result.version_id as string, alreadyFinalized: Boolean(result.already_finalized), customerId: scan?.customer_id ?? null, companyId: scan?.company_id ?? null } };
}
