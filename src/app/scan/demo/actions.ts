"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoWorkspace } from "@/lib/demo/workspace";
import { getWorkspaceContext } from "@/lib/workspace/context";

const input = z.object({ requirementId: z.string().uuid(), documentNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,30}$/), expiresOn: z.string().date() });
const fail = (id: string, message: string): never => redirect(`/scan/demo?requirementId=${id}&error=${encodeURIComponent(message)}` as never);

export async function saveDemoPassportAction(form: FormData) {
  const context = await getWorkspaceContext();
  if (!context || !isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug })) redirect("/dashboard" as never);
  const rawId = String(form.get("requirementId") ?? "");
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(rawId, "Check the passport number and expiry date.");
  const { requirementId, documentNumber, expiresOn } = parsed.data;
  if (expiresOn <= new Date().toISOString().slice(0, 10)) return fail(requirementId, "Use a future expiry date.");
  const { data: requirement } = await context.supabase.from("service_request_requirements").select("id,name,document_type_id,service_request_id,service_requests(customer_id,external_reference)").eq("organization_id", context.organization.id).eq("id", requirementId).maybeSingle();
  const request = requirement && (Array.isArray(requirement.service_requests) ? requirement.service_requests[0] : requirement.service_requests);
  if (!requirement || requirement.name !== "Passport" || !requirement.document_type_id || !request || request.external_reference !== "DEMO-SR-001") return fail(requirementId, "Demo passport is unavailable for this request.");
  const { data: existing } = await context.supabase.from("documents").select("id,customer_id,document_type_id").eq("organization_id", context.organization.id).eq("document_number", documentNumber).is("archived_at", null).maybeSingle();
  if (existing && (existing.customer_id !== request.customer_id || existing.document_type_id !== requirement.document_type_id)) return fail(requirementId, "That document number is already used.");
  let documentId = existing?.id;
  if (!documentId) {
    const { data: created, error } = await context.supabase.from("documents").insert({ organization_id: context.organization.id, customer_id: request.customer_id, document_type_id: requirement.document_type_id, display_name: "Passport · demo simulation", document_number: documentNumber, expires_on: expiresOn, status: "valid", notes: "Fictional demo metadata. No binary upload or AI extraction." }).select("id").single();
    if (error || !created) return fail(requirementId, "Could not save the demo document.");
    documentId = created.id;
  }
  const { error: attachError } = await context.supabase.from("service_request_requirements").update({ document_id: documentId, status: "received" }).eq("organization_id", context.organization.id).eq("id", requirementId).eq("service_request_id", requirement.service_request_id);
  if (attachError) return fail(requirementId, "Could not attach the demo passport.");
  revalidatePath(`/service-requests/${requirement.service_request_id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/customers/${request.customer_id}`);
  redirect(`/service-requests/${requirement.service_request_id}?demoPassport=1#checklist` as never);
}
