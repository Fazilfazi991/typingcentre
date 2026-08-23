"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin, writePlatformAudit } from "@/lib/platform/admin";

const id = z.string().uuid();
function text(value: FormDataEntryValue | null) { return typeof value === "string" ? value.trim() : ""; }
function today() { return new Date().toISOString(); }

export async function changeTenantState(formData: FormData) {
  const organizationId = id.parse(text(formData.get("organizationId"))); const state = z.enum(["active", "trial", "paused", "suspended", "cancelled"]).parse(text(formData.get("state")));
  const context = await requirePlatformAdmin(`/admin/typing-centres/${organizationId}`);
  const { data: before, error: readError } = await context.admin.from("organizations").select("id,account_state,status,is_active").eq("id", organizationId).single(); if (readError) throw readError;
  const patch = state === "suspended" ? { account_state: state, status: "suspended", is_active: false } : state === "cancelled" ? { account_state: state, status: "removed", is_active: false } : { account_state: state, status: "active", is_active: true };
  const { error } = await context.admin.from("organizations").update(patch).eq("id", organizationId); if (error) throw error;
  await writePlatformAudit(context, { action: `tenant.${state}`, targetType: "organization", targetId: organizationId, organizationId, before, after: patch }); revalidatePath(`/admin/typing-centres/${organizationId}`); revalidatePath("/admin");
}

export async function updateSubscription(formData: FormData) {
  const organizationId = id.parse(text(formData.get("organizationId"))); const context = await requirePlatformAdmin(`/admin/typing-centres/${organizationId}`);
  const input = z.object({ plan: z.enum(["starter", "business", "pro"]), status: z.enum(["trial", "active", "past_due", "suspended", "cancelled"]), ends: z.string().optional(), amount: z.coerce.number().min(0).optional(), billingCycle: z.enum(["monthly", "quarterly", "yearly", "custom"]) }).parse({ plan: text(formData.get("plan")), status: text(formData.get("status")), ends: text(formData.get("ends")) || undefined, amount: text(formData.get("amount")) || undefined, billingCycle: text(formData.get("billingCycle")) });
  const { data: before, error: readError } = await context.admin.from("organization_subscriptions").select("*").eq("organization_id", organizationId).single(); if (readError) throw readError;
  const after = { plan: input.plan, status: input.status, billing_cycle: input.billingCycle, amount: input.amount ?? null, current_period_ends_at: input.ends ? new Date(`${input.ends}T23:59:59Z`).toISOString() : null };
  const { error } = await context.admin.from("organization_subscriptions").update(after).eq("organization_id", organizationId); if (error) throw error;
  await writePlatformAudit(context, { action: "subscription.updated", targetType: "subscription", targetId: before.id, organizationId, before, after }); revalidatePath(`/admin/typing-centres/${organizationId}`); revalidatePath("/admin/subscriptions");
}

export async function recordManualPayment(formData: FormData) {
  const organizationId = id.parse(text(formData.get("organizationId"))); const context = await requirePlatformAdmin("/admin/payments");
  const input = z.object({ amount: z.coerce.number().positive(), date: z.string().min(10), method: z.string().min(2).max(80), reference: z.string().max(120).optional(), notes: z.string().max(1000).optional() }).parse({ amount: text(formData.get("amount")), date: text(formData.get("date")), method: text(formData.get("method")), reference: text(formData.get("reference")) || undefined, notes: text(formData.get("notes")) || undefined });
  const { data: subscription } = await context.admin.from("organization_subscriptions").select("id,currency").eq("organization_id", organizationId).maybeSingle();
  const payment = { organization_id: organizationId, subscription_id: subscription?.id ?? null, amount: input.amount, currency: subscription?.currency ?? "AED", payment_method: input.method, reference: input.reference ?? null, notes: input.notes ?? null, status: "paid", paid_at: new Date(`${input.date}T12:00:00Z`).toISOString(), recorded_by: context.userId };
  const { data, error } = await context.admin.from("platform_payments").insert(payment).select("id").single(); if (error) throw error;
  await writePlatformAudit(context, { action: "payment.manual_recorded", targetType: "payment", targetId: data.id, organizationId, after: { amount: input.amount, reference: input.reference } }); revalidatePath("/admin/payments"); revalidatePath(`/admin/typing-centres/${organizationId}`);
}

export async function setUserAccess(formData: FormData) {
  const userId = id.parse(text(formData.get("userId"))); const status = z.enum(["active", "suspended"]).parse(text(formData.get("status"))); const context = await requirePlatformAdmin("/admin/users");
  const { data: before, error: readError } = await context.admin.from("profiles").select("id,status").eq("id", userId).single(); if (readError) throw readError;
  const { error } = await context.admin.from("profiles").update({ status }).eq("id", userId); if (error) throw error;
  await writePlatformAudit(context, { action: `user.${status === "active" ? "reactivated" : "disabled"}`, targetType: "profile", targetId: userId, before, after: { status } }); revalidatePath("/admin/users");
}

export async function addAdminNote(formData: FormData) {
  const organizationId = id.parse(text(formData.get("organizationId"))); const body = z.string().min(1).max(4000).parse(text(formData.get("body"))); const context = await requirePlatformAdmin(`/admin/typing-centres/${organizationId}`);
  const { error } = await context.admin.from("platform_admin_notes").insert({ organization_id: organizationId, author_user_id: context.userId, body }); if (error) throw error;
  await writePlatformAudit(context, { action: "tenant.note_added", targetType: "organization", targetId: organizationId, organizationId, after: { noteAdded: true, at: today() } }); revalidatePath(`/admin/typing-centres/${organizationId}`);
}

export async function provisionTypingCentre(formData: FormData) {
  const context = await requirePlatformAdmin("/admin/typing-centres/new");
  const input = z.object({ name: z.string().min(2).max(160), legalName: z.string().max(160).optional(), email: z.string().email(), ownerName: z.string().min(2).max(160), ownerMobile: z.string().min(6).max(30), phone: z.string().min(6).max(30), whatsapp: z.string().max(30).optional(), address: z.string().max(300).optional(), location: z.string().min(2).max(120), country: z.string().max(80).optional(), plan: z.enum(["starter", "business", "pro"]), billingCycle: z.enum(["monthly", "quarterly", "yearly", "custom"]), state: z.enum(["active", "trial", "paused", "suspended"]), renewal: z.string().optional() }).parse({ name: text(formData.get("name")), legalName: text(formData.get("legalName")) || undefined, email: text(formData.get("email")), ownerName: text(formData.get("ownerName")), ownerMobile: text(formData.get("ownerMobile")), phone: text(formData.get("phone")), whatsapp: text(formData.get("whatsapp")) || undefined, address: text(formData.get("address")) || undefined, location: text(formData.get("location")), country: text(formData.get("country")) || undefined, plan: text(formData.get("plan")), billingCycle: text(formData.get("billingCycle")), state: text(formData.get("state")), renewal: text(formData.get("renewal")) || undefined });
  const slugBase = input.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "typing-centre"; const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://noteitapp.com").replace(/\/$/, "");
  const { data: invite, error: inviteError } = await context.admin.auth.admin.inviteUserByEmail(input.email, { data: { full_name: input.ownerName }, redirectTo: `${appUrl}/auth/callback?next=/onboarding/setup` }); if (inviteError || !invite.user) throw new Error("Could not send the owner invitation.");
  const org = { name: input.name, legal_name: input.legalName ?? null, slug, location: input.country ? `${input.location}, ${input.country}` : input.location, business_email: input.email, phone: input.phone, whatsapp_number: input.whatsapp ?? null, address: input.address ?? null, account_state: input.state, status: input.state === "suspended" ? "suspended" : "active", is_active: input.state !== "suspended" };
  const { data: organization, error } = await context.admin.from("organizations").insert(org).select("id").single(); if (error) throw error;
  const subscriptionStatus = input.state === "trial" ? "trial" : input.state === "active" ? "active" : "suspended";
  const ends = input.renewal ? new Date(`${input.renewal}T23:59:59Z`).toISOString() : null;
  const results = await Promise.all([context.admin.from("organization_memberships").insert({ organization_id: organization.id, user_id: invite.user.id, role: "owner", status: "active", is_primary_owner: true }), context.admin.from("organization_subscriptions").insert({ organization_id: organization.id, plan: input.plan, status: subscriptionStatus, billing_cycle: input.billingCycle, current_period_starts_at: today(), current_period_ends_at: ends, trial_ends_at: subscriptionStatus === "trial" ? ends : null }), context.admin.from("organization_usage_counters").insert({ organization_id: organization.id })]); if (results.some((r) => r.error)) throw new Error("Typing centre was created but setup is incomplete; contact support before retrying.");
  await writePlatformAudit(context, { action: "tenant.created", targetType: "organization", targetId: organization.id, organizationId: organization.id, after: { name: input.name, ownerEmail: input.email, plan: input.plan } }); revalidatePath("/admin/typing-centres");
}

export async function savePlatformSettings(formData: FormData) {
  const context = await requirePlatformAdmin("/admin/settings");
  const value = { platformName: z.string().min(2).max(120).parse(text(formData.get("platformName"))), supportEmail: z.string().email().parse(text(formData.get("supportEmail"))), supportPhone: text(formData.get("supportPhone")), currency: z.string().length(3).parse(text(formData.get("currency"))).toUpperCase(), paymentNotes: text(formData.get("paymentNotes")) };
  const { error } = await context.admin.from("platform_settings").upsert({ key: "general", value, updated_by: context.userId, updated_at: today() }); if (error) throw error;
  await writePlatformAudit(context, { action: "platform.settings_updated", targetType: "platform_settings", after: { fields: Object.keys(value) } }); revalidatePath("/admin/settings");
}
