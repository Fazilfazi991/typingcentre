"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { safeDatabaseError } from "@/lib/workspace/utils";
import {
  createDocumentDownloadUrl,
  createDocumentUploadUrl,
  inspectDocumentObject,
} from "@/lib/r2/objects";
import { getR2Configuration } from "@/lib/r2/client";
import {
  createDocumentObjectKey,
  documentSignedAccessSchema,
  documentUploadSessionSchema,
  documentVersionIdSchema,
  normalizeOriginalFilename,
  validateDocumentFileMetadata,
} from "./validation";

type SafeResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function workspaceOrUnavailable() {
  const context = await getWorkspaceContext();
  if (!context) return null;
  return context;
}

async function validateDocumentRelationships(
  context: NonNullable<Awaited<ReturnType<typeof workspaceOrUnavailable>>>,
  input: { customerId: string | null; companyId: string | null; branchId: string | null },
) {
  if (!input.customerId && !input.companyId) return "Select a customer or company.";
  if (input.branchId && !input.companyId) return "Select a company before selecting a branch.";

  const [{ data: customer }, { data: company }, { data: branch }] = await Promise.all([
    input.customerId
      ? context.supabase
          .from("customers")
          .select("id, company_id")
          .eq("id", input.customerId)
          .eq("organization_id", context.organization.id)
          .is("archived_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    input.companyId
      ? context.supabase
          .from("companies")
          .select("id")
          .eq("id", input.companyId)
          .eq("organization_id", context.organization.id)
          .is("archived_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    input.branchId
      ? context.supabase
          .from("branches")
          .select("id, company_id")
          .eq("id", input.branchId)
          .eq("organization_id", context.organization.id)
          .is("archived_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (input.customerId && !customer) return "The selected customer is unavailable.";
  if (input.companyId && !company) return "The selected company is unavailable.";
  if (input.branchId && !branch) return "The selected branch is unavailable.";
  if (customer && input.companyId && customer.company_id !== input.companyId)
    return "The selected customer does not belong to that company.";
  if (branch && branch.company_id !== input.companyId)
    return "Select a branch that belongs to the selected company.";
  return null;
}

function toNull(value: string | undefined) {
  return value?.trim() || null;
}

export async function createDocumentUploadSession(
  input: unknown,
): Promise<
  SafeResult<{ documentId: string; versionId: string; uploadUrl: string; contentType: string }>
> {
  const parsed = documentUploadSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the document details and try again." };

  const file = validateDocumentFileMetadata(parsed.data);
  if (!file.ok) return { ok: false, message: file.error ?? "The selected file is unavailable." };

  let config;
  try {
    config = getR2Configuration();
  } catch {
    return { ok: false, message: "Private document storage is not configured yet." };
  }
  if (parsed.data.fileSizeBytes > config.R2_MAX_FILE_SIZE_BYTES)
    return { ok: false, message: "The selected file is too large." };

  const context = await workspaceOrUnavailable();
  if (!context) return { ok: false, message: "Your workspace is unavailable." };

  const customerId = toNull(parsed.data.customerId);
  const companyId = toNull(parsed.data.companyId);
  const branchId = toNull(parsed.data.branchId);
  let documentId = toNull(parsed.data.documentId);

  if (documentId) {
    const { data: document } = await context.supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("organization_id", context.organization.id)
      .is("archived_at", null)
      .maybeSingle();
    if (!document) return { ok: false, message: "The selected document is unavailable." };
  } else {
    const relationshipError = await validateDocumentRelationships(context, {
      customerId,
      companyId,
      branchId,
    });
    if (relationshipError) return { ok: false, message: relationshipError };
    documentId = randomUUID();
    const { error } = await context.supabase.from("documents").insert({
      id: documentId,
      organization_id: context.organization.id,
      document_type_id: parsed.data.documentTypeId,
      customer_id: customerId,
      company_id: companyId,
      branch_id: branchId,
      display_name: parsed.data.displayName,
      document_number: toNull(parsed.data.documentNumber),
      issued_on: toNull(parsed.data.issueDate),
      expires_on: toNull(parsed.data.expiryDate),
      notes: toNull(parsed.data.notes),
      status: "valid",
    });
    if (error) return { ok: false, message: safeDatabaseError(error) };
  }

  const versionId = randomUUID();
  const objectKey = createDocumentObjectKey({
    organizationId: context.organization.id,
    documentId,
    versionId,
    mimeType: parsed.data.mimeType,
    randomId: randomUUID(),
  });
  const originalFilename = normalizeOriginalFilename(parsed.data.originalFilename);
  const storedFilename = `${versionId}.${objectKey.split(".").pop()}`;
  const { error: versionError } = await context.supabase.from("document_versions").insert({
    id: versionId,
    organization_id: context.organization.id,
    document_id: documentId,
    version_number: 0,
    object_key: objectKey,
    original_filename: originalFilename,
    stored_filename: storedFilename,
    mime_type: parsed.data.mimeType,
    expected_mime_type: parsed.data.mimeType,
    expected_size_bytes: parsed.data.fileSizeBytes,
    upload_status: "pending",
    cleanup_eligible_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (versionError) return { ok: false, message: safeDatabaseError(versionError) };

  try {
    const uploadUrl = await createDocumentUploadUrl(objectKey, parsed.data.mimeType);
    return {
      ok: true,
      data: { documentId, versionId, uploadUrl, contentType: parsed.data.mimeType },
    };
  } catch {
    return { ok: false, message: "We could not prepare the upload. Please try again." };
  }
}

export async function finalizeDocumentUpload(
  input: unknown,
): Promise<SafeResult<{ documentId: string; versionId: string; alreadyFinalized: boolean }>> {
  const parsed = documentVersionIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The upload is unavailable." };
  const context = await workspaceOrUnavailable();
  if (!context) return { ok: false, message: "Your workspace is unavailable." };

  const { data: version } = await context.supabase
    .from("document_versions")
    .select("id, document_id, object_key, expected_size_bytes, expected_mime_type, upload_status")
    .eq("id", parsed.data.versionId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!version) return { ok: false, message: "The upload is unavailable." };
  if (version.upload_status === "complete")
    return {
      ok: true,
      data: { documentId: version.document_id, versionId: version.id, alreadyFinalized: true },
    };

  try {
    const object = await inspectDocumentObject(version.object_key);
    const size = object.ContentLength;
    const mimeType = object.ContentType?.split(";", 1)[0];
    if (size !== version.expected_size_bytes || mimeType !== version.expected_mime_type)
      return { ok: false, message: "The uploaded file did not match the approved request." };
    const { data, error } = await context.supabase.rpc("finalize_document_version", {
      target_version_id: version.id,
      confirmed_size_bytes: size,
      confirmed_mime_type: mimeType,
    });
    if (error || !data)
      return { ok: false, message: "We could not finalise the upload. Please try again." };
  } catch {
    return {
      ok: false,
      message: "We could not verify the uploaded file. You can safely try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/documents/${version.document_id}`);
  return {
    ok: true,
    data: { documentId: version.document_id, versionId: version.id, alreadyFinalized: false },
  };
}

export async function createDocumentSignedAccessUrl(
  input: unknown,
): Promise<SafeResult<{ url: string }>> {
  const parsed = documentSignedAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The document is unavailable." };
  const context = await workspaceOrUnavailable();
  if (!context) return { ok: false, message: "Your workspace is unavailable." };

  const { data: document } = await context.supabase
    .from("documents")
    .select("id, current_version_id")
    .eq("id", parsed.data.documentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  const versionId = parsed.data.versionId ?? document?.current_version_id;
  if (!document || !versionId) return { ok: false, message: "The document file is unavailable." };
  const { data: version } = await context.supabase
    .from("document_versions")
    .select("id, object_key, original_filename, mime_type, upload_status")
    .eq("id", versionId)
    .eq("document_id", document.id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!version || version.upload_status !== "complete")
    return { ok: false, message: "The document file is unavailable." };

  try {
    return {
      ok: true,
      data: {
        url: await createDocumentDownloadUrl(
          version.object_key,
          version.mime_type,
          version.original_filename,
          parsed.data.disposition,
        ),
      },
    };
  } catch {
    return { ok: false, message: "We could not prepare the document file. Please try again." };
  }
}
