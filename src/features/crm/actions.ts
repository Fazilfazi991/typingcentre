"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customerArchiveSchema, customerDatabaseError } from "@/features/crm/customer-utils";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { safeDatabaseError } from "@/lib/workspace/utils";
import { dubaiDateTimeToUtcISOString } from "@/lib/dates/expiry";
import { branchSchema, companySchema, customerSchema, followUpSchema, followUpUpdateSchema, completeFollowUpSchema } from "./schemas";

const emptyToNull = (value: string | undefined) => value?.trim() || null;

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function workspaceOrRedirect() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  return context;
}

async function log(
  context: Awaited<ReturnType<typeof workspaceOrRedirect>>,
  event: string,
  entityType: string,
  entityId: string,
) {
  await context.supabase.rpc("log_workspace_activity", {
    event_kind: event,
    entity_type: entityType,
    entity_id: entityId,
  });
}

async function validateCustomerRelationship(
  context: Awaited<ReturnType<typeof workspaceOrRedirect>>,
  companyId: string | null,
  branchId: string | null,
) {
  if (!companyId && branchId) {
    return "Select a company before selecting a branch.";
  }

  if (companyId) {
    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("id", companyId)
      .is("archived_at", null)
      .maybeSingle();

    if (!company) {
      return "The selected company is unavailable.";
    }
  }

  if (branchId) {
    const { data: branch } = await context.supabase
      .from("branches")
      .select("id,company_id")
      .eq("organization_id", context.organization.id)
      .eq("id", branchId)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .maybeSingle();

    if (!branch) {
      return "Select a branch that belongs to the selected company.";
    }
  }

  return null;
}

async function validateFollowUpCustomer(context: Awaited<ReturnType<typeof workspaceOrRedirect>>, customerId: string) {
  const { data: customer } = await context.supabase.from("customers").select("id").eq("id", customerId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle();
  return customer ? null : "The selected customer is unavailable.";
}

async function validateFollowUpRelationships(context: Awaited<ReturnType<typeof workspaceOrRedirect>>, customerId: string | null, companyId: string | null) {
  if (!customerId && !companyId) return "Select a customer or company.";
  const [{ data: customer }, { data: company }] = await Promise.all([
    customerId ? context.supabase.from("customers").select("id,company_id").eq("id", customerId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
    companyId ? context.supabase.from("companies").select("id").eq("id", companyId).eq("organization_id", context.organization.id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (customerId && !customer) return "The selected customer is unavailable.";
  if (companyId && !company) return "The selected company is unavailable.";
  if (customer && companyId && customer.company_id !== companyId) return "The selected customer does not belong to that company.";
  return null;
}

function safeCustomerError(error: { code?: string; message?: string } | null | undefined) {
  return customerDatabaseError(error) ?? safeDatabaseError(error);
}

export async function createCompanyAction(formData: FormData) {
  const parsed = companySchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/companies/new?error=validation" as never);

  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const { data, error } = await context.supabase
    .from("companies")
    .insert({
      organization_id: context.organization.id,
      name: value.name,
      city: value.city,
      licence_number: emptyToNull(value.licenceNumber),
      trade_name: emptyToNull(value.tradeName),
      industry: emptyToNull(value.industry),
      business_activity: emptyToNull(value.businessActivity),
      company_type: emptyToNull(value.companyType),
      contact_name: emptyToNull(value.contactName),
      contact_phone: emptyToNull(value.contactPhone),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      contact_email: emptyToNull(value.contactEmail),
      address: emptyToNull(value.address),
      establishment_card_number: emptyToNull(value.establishmentCardNumber),
      immigration_file_number: emptyToNull(value.immigrationFileNumber),
      vat_registration_number: emptyToNull(value.vatRegistrationNumber),
      corporate_tax_registration_number: emptyToNull(value.corporateTaxRegistrationNumber),
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/companies/new?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "company_created", "company", data.id);
  revalidatePath("/dashboard");
  revalidatePath("/companies");
  redirect(`/companies/${data.id}?created=1` as never);
}

export async function updateCompanyAction(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const parsed = companySchema.safeParse(formValues(formData));
  if (!companyId || !parsed.success) redirect(`/companies/${companyId}?error=validation` as never);

  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const { data, error } = await context.supabase
    .from("companies")
    .update({
      name: value.name,
      city: value.city,
      licence_number: emptyToNull(value.licenceNumber),
      trade_name: emptyToNull(value.tradeName),
      industry: emptyToNull(value.industry),
      business_activity: emptyToNull(value.businessActivity),
      company_type: emptyToNull(value.companyType),
      contact_name: emptyToNull(value.contactName),
      contact_phone: emptyToNull(value.contactPhone),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      contact_email: emptyToNull(value.contactEmail),
      address: emptyToNull(value.address),
      establishment_card_number: emptyToNull(value.establishmentCardNumber),
      immigration_file_number: emptyToNull(value.immigrationFileNumber),
      vat_registration_number: emptyToNull(value.vatRegistrationNumber),
      corporate_tax_registration_number: emptyToNull(value.corporateTaxRegistrationNumber),
    })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect(`/companies/${companyId}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "company_updated", "company", data.id);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?updated=1` as never);
}

export async function createBranchAction(formData: FormData) {
  const parsed = branchSchema.safeParse(formValues(formData));
  const companyId = String(formData.get("companyId") ?? "");
  if (!parsed.success || !companyId) redirect(`/companies/${companyId}?error=validation` as never);

  const context = await workspaceOrRedirect();
  const { data: company } = await context.supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) redirect("/companies" as never);

  const value = parsed.data;
  const { data, error } = await context.supabase
    .from("branches")
    .insert({
      organization_id: context.organization.id,
      company_id: companyId,
      name: value.name,
      city: value.city,
      code: emptyToNull(value.code),
      contact_name: emptyToNull(value.contactName),
      phone: emptyToNull(value.phone),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      email: emptyToNull(value.email),
      address: emptyToNull(value.address),
      trade_licence_number: emptyToNull(value.tradeLicenceNumber),
      notes: emptyToNull(value.notes),
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/companies/${companyId}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "branch_created", "branch", data.id);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?branch=created` as never);
}

export async function archiveBranchAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const context = await workspaceOrRedirect();
  const { error } = await context.supabase
    .from("branches")
    .update({ archived_at: new Date().toISOString(), is_active: false, status: "removed" })
    .eq("id", branchId);

  if (error) redirect(`/companies/${companyId}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "branch_archived", "branch", branchId);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?branch=archived` as never);
}

export async function updateBranchAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const parsed = branchSchema.safeParse(formValues(formData));
  if (!branchId || !companyId || !parsed.success) redirect(`/companies/${companyId}?error=validation` as never);

  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const { data, error } = await context.supabase
    .from("branches")
    .update({
      name: value.name,
      city: value.city,
      code: emptyToNull(value.code),
      contact_name: emptyToNull(value.contactName),
      phone: emptyToNull(value.phone),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      email: emptyToNull(value.email),
      address: emptyToNull(value.address),
      trade_licence_number: emptyToNull(value.tradeLicenceNumber),
      notes: emptyToNull(value.notes),
    })
    .eq("id", branchId)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect(`/companies/${companyId}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "branch_updated", "branch", data.id);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?branch=updated` as never);
}

export async function createCustomerAction(formData: FormData) {
  const parsed = customerSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/customers/new?error=validation" as never);

  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const companyId = emptyToNull(value.companyId);
  const branchId = emptyToNull(value.branchId);
  const relationshipError = await validateCustomerRelationship(context, companyId, branchId);

  if (relationshipError) {
    redirect(`/customers/new?error=${encodeURIComponent(relationshipError)}` as never);
  }

  const { data, error } = await context.supabase
    .from("customers")
    .insert({
      organization_id: context.organization.id,
      full_name: value.fullName,
      customer_type: value.customerType,
      phone: value.phone,
      nationality: emptyToNull(value.nationality),
      email: emptyToNull(value.email),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      passport_number: emptyToNull(value.passportNumber),
      emirates_id_number: emptyToNull(value.emiratesIdNumber),
      company_id: companyId,
      branch_id: branchId,
      date_of_birth: emptyToNull(value.dateOfBirth),
      gender: emptyToNull(value.gender),
      residential_address: emptyToNull(value.residentialAddress),
      sponsor_name: emptyToNull(value.sponsorName),
      sponsor_company: emptyToNull(value.sponsorCompany),
      visa_type: emptyToNull(value.visaType),
      profession: emptyToNull(value.profession),
      notes: emptyToNull(value.notes),
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/customers/new?error=${encodeURIComponent(safeCustomerError(error))}` as never);

  await log(context, "customer_created", "customer", data.id);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/customers/${data.id}?created=1` as never);
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const parsed = customerSchema.safeParse(formValues(formData));
  if (!customerId || !parsed.success) redirect(`/customers/${customerId}?error=validation` as never);

  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const companyId = emptyToNull(value.companyId);
  const branchId = emptyToNull(value.branchId);
  const relationshipError = await validateCustomerRelationship(context, companyId, branchId);

  if (relationshipError) {
    redirect(`/customers/${customerId}/edit?error=${encodeURIComponent(relationshipError)}` as never);
  }

  const { data, error } = await context.supabase
    .from("customers")
    .update({
      full_name: value.fullName,
      customer_type: value.customerType,
      phone: value.phone,
      nationality: emptyToNull(value.nationality),
      email: emptyToNull(value.email),
      whatsapp_number: emptyToNull(value.whatsappNumber),
      passport_number: emptyToNull(value.passportNumber),
      emirates_id_number: emptyToNull(value.emiratesIdNumber),
      company_id: companyId,
      branch_id: branchId,
      date_of_birth: emptyToNull(value.dateOfBirth),
      gender: emptyToNull(value.gender),
      residential_address: emptyToNull(value.residentialAddress),
      sponsor_name: emptyToNull(value.sponsorName),
      sponsor_company: emptyToNull(value.sponsorCompany),
      visa_type: emptyToNull(value.visaType),
      profession: emptyToNull(value.profession),
      notes: emptyToNull(value.notes),
    })
    .eq("id", customerId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(`/customers/${customerId}/edit?error=${encodeURIComponent(safeCustomerError(error))}` as never);
  }

  await log(context, "customer_updated", "customer", data.id);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}?updated=1` as never);
}

export async function createFollowUpAction(formData: FormData) {
  const parsed = followUpSchema.safeParse(formValues(formData));
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  if (!parsed.success) redirect(`${returnTo}?error=validation` as never);

  const context = await workspaceOrRedirect();
  const customerId = emptyToNull(parsed.data.customerId); const companyId = emptyToNull(parsed.data.companyId);
  const relationshipError = await validateFollowUpRelationships(context, customerId, companyId);
  if (relationshipError) redirect(`${returnTo}?error=${encodeURIComponent(relationshipError)}` as never);

  const { data, error } = await context.supabase
    .from("follow_ups")
    .insert({
      organization_id: context.organization.id,
      customer_id: customerId, company_id: companyId, created_by: context.user.id,
      due_at: parsed.data.dueAt,
      note: emptyToNull(parsed.data.note),
    })
    .select("id")
    .single();

  if (error || !data) redirect(`${returnTo}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "follow_up_created", "follow_up", data.id);
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(`${returnTo}?followUp=created` as never);
}

export async function updateFollowUpAction(formData: FormData) {
  const returnTo = String(formData.get("returnTo") ?? "/follow-ups");
  const parsed = followUpUpdateSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect(`${returnTo}?error=validation` as never);
  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const customerId = emptyToNull(value.customerId); const companyId = emptyToNull(value.companyId); const relationshipError = await validateFollowUpRelationships(context, customerId, companyId);
  if (relationshipError) redirect(`${returnTo}?error=${encodeURIComponent(relationshipError)}` as never);
  const { data, error } = await context.supabase.from("follow_ups").update({ customer_id: customerId, company_id: companyId, due_at: value.dueAt, note: emptyToNull(value.note) }).eq("id", value.followUpId).eq("organization_id", context.organization.id).neq("status", "completed").select("id").maybeSingle();
  if (error || !data) redirect(`${returnTo}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);
  await log(context, "follow_up_updated", "follow_up", data.id);
  revalidatePath("/dashboard"); revalidatePath("/follow-ups"); if (customerId) revalidatePath(`/customers/${customerId}`); if (companyId) revalidatePath(`/companies/${companyId}`);
  redirect(`${returnTo}?followUp=updated` as never);
}

export async function archiveCompanyAction(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const context = await workspaceOrRedirect();
  const { error } = await context.supabase
    .from("companies")
    .update({ archived_at: new Date().toISOString(), is_active: false, status: "removed" })
    .eq("id", companyId);

  if (error) redirect(`/companies/${companyId}?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "company_archived", "company", companyId);
  revalidatePath("/dashboard");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect("/companies?archived=1" as never);
}

export async function archiveCustomerAction(formData: FormData) {
  const parsed = customerArchiveSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/customers?error=validation" as never);

  const context = await workspaceOrRedirect();
  const customerId = parsed.data.customerId;
  const { data, error } = await context.supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString(), is_active: false, status: "removed" })
    .eq("id", customerId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(`/customers/${customerId}?error=${encodeURIComponent(safeCustomerError(error))}` as never);
  }

  await log(context, "customer_archived", "customer", customerId);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect("/customers?archived=1" as never);
}

export async function completeFollowUpAction(formData: FormData) {
  const parsed = completeFollowUpSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/follow-ups?error=validation" as never);
  const context = await workspaceOrRedirect();
  const value = parsed.data;
  const { data: current } = await context.supabase.from("follow_ups").select("id,customer_id,company_id,status,next_follow_up_id").eq("id", value.followUpId).eq("organization_id", context.organization.id).maybeSingle();
  if (!current || current.status === "completed") redirect("/follow-ups?error=unavailable" as never);
  let nextId: string | null = null;
  if (value.nextDueAt) {
    const { data: next, error: nextError } = await context.supabase.from("follow_ups").insert({ organization_id: context.organization.id, customer_id: current.customer_id, company_id: current.company_id, due_at: dubaiDateTimeToUtcISOString(value.nextDueAt), note: emptyToNull(value.nextNote), created_by: context.user.id }).select("id").single();
    if (nextError || !next) redirect("/follow-ups?error=save" as never); nextId = next.id;
  }
  const { data, error } = await context.supabase
    .from("follow_ups")
    .update({ status: "completed", completed_at: new Date().toISOString(), customer_response: emptyToNull(value.customerResponse), next_follow_up_id: nextId })
    .eq("id", value.followUpId)
    .eq("organization_id", context.organization.id)
    .neq("status", "completed")
    .select("id")
    .maybeSingle();

  if (error || !data) redirect(`/follow-ups?error=${encodeURIComponent(safeDatabaseError(error))}` as never);

  await log(context, "follow_up_completed", "follow_up", data.id);
  revalidatePath("/dashboard");
  revalidatePath("/follow-ups"); if (current.customer_id) revalidatePath(`/customers/${current.customer_id}`); if (current.company_id) revalidatePath(`/companies/${current.company_id}`);
  redirect("/follow-ups?followUp=completed" as never);
}
