"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoWorkspace } from "@/lib/demo/workspace";
import { getWorkspaceContext } from "@/lib/workspace/context";

const input = z.object({ requestId: z.string().uuid(), documentNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,40}$/), expiresOn: z.string().date() });
export async function saveDemoRenewedVisaAction(form: FormData) {
  const context = await getWorkspaceContext();
  if (!context || !isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug })) redirect("/dashboard" as never);
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the renewed document details." };
  const { requestId, documentNumber, expiresOn } = parsed.data;
  if (expiresOn <= new Date().toISOString().slice(0, 10)) return { error: "Expiry must be in the future." };
  const { data: request } = await context.supabase.from("service_requests").select("id,customer_id,status,external_reference").eq("organization_id", context.organization.id).eq("id", requestId).maybeSingle();
  if (!request || request.status !== "completed" || request.external_reference !== "DEMO-SR-001") return { error: "Complete Ahmed's demo service first." };
  const { data: type } = await context.supabase.from("organization_document_types").select("id").eq("organization_id", context.organization.id).eq("name", "Residence Visa").maybeSingle();
  if (!type) return { error: "Residence Visa document type is unavailable." };
  const { data: existing } = await context.supabase.from("documents").select("id,customer_id,document_type_id").eq("organization_id", context.organization.id).eq("document_number", documentNumber).is("archived_at", null).maybeSingle();
  if (existing && (existing.customer_id !== request.customer_id || existing.document_type_id !== type.id)) return { error: "That document number is already used." };
  let documentId = existing?.id;
  if (!documentId) {
    const { data: created, error } = await context.supabase.from("documents").insert({ organization_id: context.organization.id, customer_id: request.customer_id, document_type_id: type.id, display_name: "Renewed Residence Visa · demo", document_number: documentNumber, issued_on: new Date().toISOString().slice(0, 10), expires_on: expiresOn, status: "valid", notes: "Fictional renewed visa metadata from completed demo service. No file uploaded." }).select("id").single();
    if (error || !created) return { error: "Could not save the renewed visa." };
    documentId = created.id;
  }
  revalidatePath(`/service-requests/${requestId}`);
  revalidatePath(`/customers/${request.customer_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/renewals");
  revalidatePath("/calendar");
}
