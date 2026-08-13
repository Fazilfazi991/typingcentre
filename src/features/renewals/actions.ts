"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dubaiDateTimeToUtcISOString } from "@/lib/dates/expiry";
import { appendRenewalNote, renewalDetailPath, renewalRangeOrDefault } from "@/lib/renewals/workflow";
import { getWorkspaceContext } from "@/lib/workspace/context";

const baseSchema = z.object({
  documentId: z.string().uuid(),
  range: z.string().optional(),
});
const noteSchema = baseSchema.extend({ note: z.string().trim().min(2).max(2000) });
const followUpSchema = baseSchema.extend({
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  note: z.string().trim().min(2).max(500),
});
const completionSchema = baseSchema.extend({
  documentNumber: z.string().trim().max(120).optional(),
  issueDate: z.string().date().optional().or(z.literal("")),
  expiryDate: z.string().date(),
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (value.issueDate && value.expiryDate <= value.issueDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiryDate"], message: "Expiry must follow issue date." });
  }
});

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function workspace() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  return context;
}

async function sourceDocument(context: Awaited<ReturnType<typeof workspace>>, documentId: string) {
  const { data } = await context.supabase.from("documents")
    .select("id,customer_id,company_id,archived_at")
    .eq("id", documentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  return data;
}

async function openRenewal(context: Awaited<ReturnType<typeof workspace>>, documentId: string) {
  const { data: existing } = await context.supabase.from("renewals")
    .select("id,status,notes,started_at")
    .eq("organization_id", context.organization.id)
    .eq("document_id", documentId)
    .in("status", ["draft", "in_progress", "submitted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await context.supabase.from("renewals").insert({
    organization_id: context.organization.id,
    document_id: documentId,
    status: "draft",
  }).select("id,status,notes,started_at").single();
  if (error || !data) throw new Error("The renewal could not be started.");
  await context.supabase.rpc("log_workspace_activity", { event_kind: "renewal_identified", entity_type: "renewal", entity_id: data.id });
  return data;
}

async function log(context: Awaited<ReturnType<typeof workspace>>, event: string, renewalId: string) {
  const { error } = await context.supabase.rpc("log_workspace_activity", {
    event_kind: event,
    entity_type: "renewal",
    entity_id: renewalId,
  });
  if (error) throw new Error("The action was saved, but its activity entry could not be recorded.");
}

function refresh(documentId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/renewals");
  revalidatePath(`/renewals/${documentId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/documents");
}

function destination(documentId: string, rawRange: string | undefined, result: string) {
  const range = renewalRangeOrDefault(rawRange);
  return `${renewalDetailPath(documentId, range)}&${result}`;
}

export async function markRenewalContactedAction(formData: FormData) {
  const parsed = baseSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/renewals?range=30d&error=invalid" as never);
  const context = await workspace();
  const document = await sourceDocument(context, parsed.data.documentId);
  if (!document || document.archived_at) redirect("/renewals?range=30d&error=unavailable" as never);
  const renewal = await openRenewal(context, document.id);
  const { error } = await context.supabase.from("renewals").update({
    status: "in_progress",
    started_at: renewal.started_at || new Date().toISOString(),
  }).eq("id", renewal.id).eq("organization_id", context.organization.id);
  if (error) redirect(destination(document.id, parsed.data.range, "error=contact") as never);
  await log(context, "renewal_contacted", renewal.id);
  refresh(document.id);
  redirect(destination(document.id, parsed.data.range, "contacted=1") as never);
}

export async function scheduleRenewalFollowUpAction(formData: FormData) {
  const parsed = followUpSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/renewals?range=30d&error=follow-up-validation" as never);
  const context = await workspace();
  const document = await sourceDocument(context, parsed.data.documentId);
  if (!document || document.archived_at) redirect("/renewals?range=30d&error=unavailable" as never);
  const renewal = await openRenewal(context, document.id);
  const dueAt = dubaiDateTimeToUtcISOString(parsed.data.dueAt);
  const { error: followUpError } = await context.supabase.from("follow_ups").insert({
    organization_id: context.organization.id,
    customer_id: document.customer_id,
    company_id: document.company_id,
    document_id: document.id,
    due_at: dueAt,
    status: "pending",
    note: parsed.data.note,
    created_by: context.user.id,
  });
  if (followUpError) redirect(destination(document.id, parsed.data.range, "error=follow-up") as never);
  const { error: renewalError } = await context.supabase.from("renewals").update({
    status: "in_progress",
    started_at: renewal.started_at || new Date().toISOString(),
  }).eq("id", renewal.id).eq("organization_id", context.organization.id);
  if (renewalError) redirect(destination(document.id, parsed.data.range, "error=follow-up") as never);
  await log(context, "renewal_follow_up_scheduled", renewal.id);
  refresh(document.id);
  redirect(destination(document.id, parsed.data.range, "followUp=created") as never);
}

export async function addRenewalNoteAction(formData: FormData) {
  const parsed = noteSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/renewals?range=30d&error=note-validation" as never);
  const context = await workspace();
  const document = await sourceDocument(context, parsed.data.documentId);
  if (!document) redirect("/renewals?range=30d&error=unavailable" as never);
  const renewal = await openRenewal(context, document.id);
  const { error } = await context.supabase.from("renewals").update({
    notes: appendRenewalNote(renewal.notes, parsed.data.note),
  }).eq("id", renewal.id).eq("organization_id", context.organization.id);
  if (error) redirect(destination(document.id, parsed.data.range, "error=note") as never);
  await log(context, "renewal_note_added", renewal.id);
  refresh(document.id);
  redirect(destination(document.id, parsed.data.range, "note=added") as never);
}

export async function closeRenewalAction(formData: FormData) {
  const parsed = noteSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/renewals?range=30d&error=close-validation" as never);
  const context = await workspace();
  const document = await sourceDocument(context, parsed.data.documentId);
  if (!document || document.archived_at) redirect("/renewals?range=30d&error=unavailable" as never);
  const renewal = await openRenewal(context, document.id);
  const { error } = await context.supabase.from("renewals").update({
    status: "cancelled",
    notes: appendRenewalNote(renewal.notes, `Closed: ${parsed.data.note}`),
  }).eq("id", renewal.id).eq("organization_id", context.organization.id);
  if (error) redirect(destination(document.id, parsed.data.range, "error=close") as never);
  await log(context, "renewal_closed", renewal.id);
  refresh(document.id);
  redirect(`${renewalDetailPath(document.id, renewalRangeOrDefault(parsed.data.range))}&closed=1` as never);
}

export async function completeRenewalAction(formData: FormData) {
  const parsed = completionSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/renewals?range=30d&error=completion-validation" as never);
  const context = await workspace();
  const document = await sourceDocument(context, parsed.data.documentId);
  if (!document || document.archived_at) redirect("/renewals?range=30d&error=unavailable" as never);
  const { data, error } = await context.supabase.rpc("complete_document_renewal", {
    target_document_id: document.id,
    replacement_document_number: parsed.data.documentNumber || "",
    replacement_issued_on: parsed.data.issueDate || null,
    replacement_expires_on: parsed.data.expiryDate,
    completion_note: parsed.data.note || null,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result?.replacement_document_id) {
    redirect(destination(document.id, parsed.data.range, "error=completion") as never);
  }
  refresh(document.id);
  revalidatePath(`/documents/${result.replacement_document_id}`);
  redirect(`${renewalDetailPath(document.id, renewalRangeOrDefault(parsed.data.range))}&renewed=1&replacement=${result.replacement_document_id}` as never);
}
