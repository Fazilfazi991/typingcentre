"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { safeDatabaseError } from "@/lib/workspace/utils";
import { canTransition, requestStatuses, type RequestStatus } from "@/lib/service-requests/workflow";
import { dubaiDateTimeToUtcISOString } from "@/lib/dates/expiry";

const uuid = z.string().uuid();
const money = z.coerce.number().finite().min(0).max(99999999);
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (value: string) => value || null;
const fail = (path: string, message: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}` as never);
const requestError = (error: { code?: string; message?: string } | null | undefined) => {
  if (error?.message?.includes("Required documents are still missing")) return "Attach or waive the required documents before submitting.";
  if (error?.message?.includes("Payment exceeds balance")) return "Payment exceeds the outstanding balance.";
  if (error?.message?.includes("Document type does not match")) return "Choose a document with the checklist item’s type.";
  if (error?.message?.includes("Document must belong")) return "The document must belong to this request’s customer.";
  return safeDatabaseError(error);
};

async function workspace() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  return context;
}

export async function createServiceAction(form: FormData) {
  const context = await workspace();
  const parsed = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/),
    name: z.string().trim().min(2).max(160),
    category: z.enum(["Residency & Visa","Emirates ID","MOHRE / Labour","Medical","Company / Business","Documents","Other"]),
    description: z.string().trim().max(1000), governmentFee: money, serviceFee: money,
    expectedDays: z.coerce.number().int().min(0).max(3650),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("/services", "Check the service details and prices.");
  const value = parsed.data;
  const { error } = await context.supabase.from("services").insert({
    organization_id: context.organization.id, code: value.code, name: value.name,
    category: value.category, description: optional(value.description),
    government_fee: value.governmentFee, service_fee: value.serviceFee, expected_days: value.expectedDays,
  });
  if (error) return fail("/services", safeDatabaseError(error));
  revalidatePath("/services");
  redirect("/services?created=1" as never);
}

export async function addServiceRequirementAction(form: FormData) {
  const context = await workspace();
  const serviceId = text(form, "serviceId");
  const parsed = z.object({ name: z.string().trim().min(2).max(160), documentTypeId: z.union([uuid,z.literal("")]), sortOrder: z.coerce.number().int().min(0).max(999) }).safeParse(Object.fromEntries(form));
  if (!uuid.safeParse(serviceId).success || !parsed.success) return fail("/services", "Check the checklist item.");
  const { error } = await context.supabase.from("service_requirements").insert({
    organization_id: context.organization.id, service_id: serviceId, name: parsed.data.name,
    document_type_id: optional(parsed.data.documentTypeId), required: form.get("required") === "on",
    sort_order: parsed.data.sortOrder,
  });
  if (error) return fail("/services", safeDatabaseError(error));
  revalidatePath("/services");
  redirect(`/services#service-${serviceId}` as never);
}

export async function updateServiceAction(form: FormData) {
  const context = await workspace(); const serviceId = text(form,"serviceId");
  const parsed = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(1000),
    governmentFee: money, serviceFee: money, expectedDays: z.coerce.number().int().min(0).max(3650) }).safeParse(Object.fromEntries(form));
  if (!uuid.safeParse(serviceId).success || !parsed.success) return fail("/services", "Check the service details and prices.");
  const value = parsed.data;
  const { error } = await context.supabase.from("services").update({ name: value.name, description: optional(value.description),
    government_fee: value.governmentFee, service_fee: value.serviceFee, expected_days: value.expectedDays })
    .eq("organization_id",context.organization.id).eq("id",serviceId);
  if (error) return fail("/services", safeDatabaseError(error));
  revalidatePath("/services");
  redirect(`/services#service-${serviceId}` as never);
}

export async function deleteServiceRequirementAction(form: FormData) {
  const context = await workspace(); const serviceId = text(form,"serviceId"); const requirementId = text(form,"requirementId");
  if (!uuid.safeParse(serviceId).success || !uuid.safeParse(requirementId).success) return fail("/services", "Checklist item unavailable.");
  const { error } = await context.supabase.from("service_requirements").delete()
    .eq("organization_id",context.organization.id).eq("service_id",serviceId).eq("id",requirementId);
  if (error) return fail("/services", safeDatabaseError(error));
  revalidatePath("/services");
  redirect(`/services#service-${serviceId}` as never);
}

export async function toggleServiceAction(form: FormData) {
  const context = await workspace();
  const serviceId = text(form, "serviceId");
  if (!uuid.safeParse(serviceId).success) return fail("/services", "Invalid service.");
  const { data: service } = await context.supabase.from("services").select("is_active").eq("organization_id",context.organization.id).eq("id",serviceId).maybeSingle();
  if (!service) return fail("/services", "Service unavailable.");
  const { error } = await context.supabase.from("services").update({ is_active: !service.is_active }).eq("organization_id",context.organization.id).eq("id",serviceId);
  if (error) return fail("/services", safeDatabaseError(error));
  revalidatePath("/services");
  redirect(`/services#service-${serviceId}` as never);
}

export async function createServiceRequestAction(form: FormData) {
  const context = await workspace();
  const parsed = z.object({
    customerId: uuid, companyId: z.union([uuid,z.literal("")]), serviceId: uuid,
    assignedTo: z.union([uuid,z.literal("")]), priority: z.enum(["normal","high","urgent"]),
    source: z.enum(["walk_in","phone","whatsapp","online","other"]), notes: z.string().trim().max(3000),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("/service-requests/new", "Choose a customer and service, then check the details.");
  const value = parsed.data;
  const { data: customer } = await context.supabase.from("customers").select("id,company_id").eq("organization_id",context.organization.id).eq("id",value.customerId).is("archived_at",null).maybeSingle();
  if (!customer || (value.companyId && customer.company_id !== value.companyId)) return fail("/service-requests/new", "Customer and company do not match.");
  const { data, error } = await context.supabase.from("service_requests").insert({
    organization_id: context.organization.id, customer_id: value.customerId,
    company_id: optional(value.companyId), service_id: value.serviceId, assigned_to: optional(value.assignedTo),
    priority: value.priority, source: value.source, notes: optional(value.notes),
  }).select("id").single();
  if (error || !data) return fail("/service-requests/new", safeDatabaseError(error));
  revalidatePath("/service-requests"); revalidatePath("/dashboard");
  redirect(`/service-requests/${data.id}?created=1` as never);
}

async function request(context: Awaited<ReturnType<typeof workspace>>, id: string) {
  if (!uuid.safeParse(id).success) return null;
  const { data } = await context.supabase.from("service_requests").select("id,status,customer_id,company_id,total_amount,paid_amount").eq("organization_id",context.organization.id).eq("id",id).is("archived_at",null).maybeSingle();
  return data;
}

export async function updateServiceRequestStatusAction(form: FormData) {
  const context = await workspace();
  const id = text(form,"requestId"); const next = text(form,"status") as RequestStatus;
  const current = await request(context,id);
  if (!current || !requestStatuses.includes(next) || !canTransition(current.status as RequestStatus,next)) return fail(`/service-requests/${id}`, "That status change is unavailable.");
  const { error } = await context.supabase.from("service_requests").update({ status: next }).eq("organization_id",context.organization.id).eq("id",id).eq("status",current.status);
  if (error) return fail(`/service-requests/${id}`, requestError(error));
  revalidatePath(`/service-requests/${id}`); revalidatePath("/service-requests"); revalidatePath("/dashboard");
  redirect(`/service-requests/${id}?updated=1` as never);
}

export async function updateServiceRequestDetailsAction(form: FormData) {
  const context = await workspace(); const id = text(form,"requestId");
  if (!await request(context,id)) return fail("/service-requests", "Request unavailable.");
  const parsed = z.object({ applicationReference: z.string().trim().max(160), externalReference: z.string().trim().max(160),
    otherCost: money, discount: money, notes: z.string().trim().max(3000),
    assignedTo: z.union([uuid,z.literal("")]),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(`/service-requests/${id}`, "Check the request details.");
  const value = parsed.data;
  const { error } = await context.supabase.from("service_requests").update({
    application_reference: optional(value.applicationReference), external_reference: optional(value.externalReference),
    other_cost: value.otherCost, discount: value.discount, notes: optional(value.notes), assigned_to: optional(value.assignedTo),
  }).eq("organization_id",context.organization.id).eq("id",id);
  if (error) return fail(`/service-requests/${id}`, requestError(error));
  revalidatePath(`/service-requests/${id}`); revalidatePath("/service-requests");
  redirect(`/service-requests/${id}?updated=1` as never);
}

export async function updateRequirementAction(form: FormData) {
  const context = await workspace(); const id = text(form,"requestId"); const requirementId = text(form,"requirementId");
  if (!await request(context,id) || !uuid.safeParse(requirementId).success) return fail(`/service-requests/${id}`, "Checklist item unavailable.");
  const status = text(form,"status"); const documentId = text(form,"documentId");
  if (!["missing","received","verified","not_required"].includes(status) || (documentId && !uuid.safeParse(documentId).success)) return fail(`/service-requests/${id}`, "Invalid checklist update.");
  const nextStatus = documentId && status === "missing" ? "received" : status;
  const { error } = await context.supabase.from("service_request_requirements").update({ status: nextStatus, document_id: optional(documentId) })
    .eq("organization_id",context.organization.id).eq("service_request_id",id).eq("id",requirementId);
  if (error) return fail(`/service-requests/${id}`, requestError(error));
  revalidatePath(`/service-requests/${id}`); revalidatePath("/dashboard");
  redirect(`/service-requests/${id}#checklist` as never);
}

export async function attachScannedDocument(input: { requirementId: string; documentId: string }) {
  const context = await workspace();
  if (!uuid.safeParse(input.requirementId).success || !uuid.safeParse(input.documentId).success) return { ok: false as const, message: "Invalid checklist item or document." };
  const { data: item } = await context.supabase.from("service_request_requirements").select("service_request_id").eq("organization_id",context.organization.id).eq("id",input.requirementId).maybeSingle();
  if (!item) return { ok: false as const, message: "Checklist item unavailable." };
  const { error } = await context.supabase.from("service_request_requirements").update({ document_id: input.documentId, status: "received" })
    .eq("organization_id",context.organization.id).eq("id",input.requirementId);
  if (error) return { ok: false as const, message: requestError(error) };
  revalidatePath(`/service-requests/${item.service_request_id}`); revalidatePath("/dashboard");
  return { ok: true as const, requestId: item.service_request_id };
}

export async function recordServicePaymentAction(form: FormData) {
  const context = await workspace(); const id = text(form,"requestId");
  if (!await request(context,id)) return fail("/service-requests", "Request unavailable.");
  const parsed = z.object({ amount: z.coerce.number().positive().max(99999999), method: z.enum(["cash","card","bank_transfer","other"]),
    reference: z.string().trim().max(160), notes: z.string().trim().max(500) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(`/service-requests/${id}`, "Check the payment details.");
  const { error } = await context.supabase.from("service_payments").insert({ organization_id: context.organization.id, service_request_id: id,
    amount: parsed.data.amount, method: parsed.data.method, reference: optional(parsed.data.reference), notes: optional(parsed.data.notes) });
  if (error) return fail(`/service-requests/${id}`, requestError(error));
  revalidatePath(`/service-requests/${id}`); revalidatePath("/service-requests"); revalidatePath("/dashboard"); revalidatePath("/reports");
  redirect(`/service-requests/${id}#payments` as never);
}

export async function createServiceFollowUpAction(form: FormData) {
  const context = await workspace(); const id = text(form,"requestId"); const current = await request(context,id);
  if (!current) return fail("/service-requests", "Request unavailable.");
  const dueAt = text(form,"dueAt"); const note = text(form,"note");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueAt) || note.length > 1000) return fail(`/service-requests/${id}`, "Check the follow-up details.");
  const { error } = await context.supabase.from("follow_ups").insert({ organization_id: context.organization.id,
    customer_id: current.customer_id, company_id: current.company_id, service_request_id: id, due_at: dubaiDateTimeToUtcISOString(dueAt), note: optional(note) });
  if (error) return fail(`/service-requests/${id}`, safeDatabaseError(error));
  revalidatePath(`/service-requests/${id}`); revalidatePath("/follow-ups"); revalidatePath("/dashboard");
  redirect(`/service-requests/${id}#follow-ups` as never);
}
