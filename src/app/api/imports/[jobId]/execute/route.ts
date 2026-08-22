import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";

const BATCH_SIZE = 100;

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to execute an import." }, { status: 403 });
  const { jobId } = await params;
  const { data: job } = await context.supabase.from("import_jobs").select("id,status,processed_rows,customers_created,companies_created,documents_created,records_updated,records_skipped,records_failed").eq("id", jobId).eq("organization_id", context.organization.id).maybeSingle();
  if (!job || !["ready", "importing"].includes(job.status)) return NextResponse.json({ error: "Validate the import before starting it." }, { status: 409 });
  await context.supabase.from("import_jobs").update({ status: "importing", started_at: new Date().toISOString() }).eq("id", jobId).eq("organization_id", context.organization.id);
  const { data: rows } = await context.supabase.from("import_job_rows").select("id,normalized_data,resolution,status").eq("import_job_id", jobId).eq("organization_id", context.organization.id).in("status", ["ready", "possible_duplicate"]).in("resolution", ["create", "update"]).order("row_number").limit(BATCH_SIZE);
  let customers = 0, companies = 0, documents = 0, failed = 0, updated = 0;
  for (const row of rows ?? []) {
    try {
      const item = row.normalized_data as Record<string, string | null>; let customerId: string | null = null; let companyId: string | null = null;
      if (item.company_name) {
        const { data: existing } = await context.supabase.from("companies").select("id").eq("organization_id", context.organization.id).ilike("name", item.company_name).maybeSingle();
        companyId = existing?.id ?? null;
        if (!companyId) { const { data, error } = await context.supabase.from("companies").insert({ organization_id: context.organization.id, name: item.company_name, contact_phone: item.company_phone, city: context.organization.location }).select("id").single(); if (error) throw error; companyId = data.id; companies++; }
      }
      if (item.customer_name) {
        const { data: existing } = item.customer_phone ? await context.supabase.from("customers").select("id").eq("organization_id", context.organization.id).eq("phone", item.customer_phone).maybeSingle() : { data: null };
        customerId = existing?.id ?? null;
        if (!customerId) { const { data, error } = await context.supabase.from("customers").insert({ organization_id: context.organization.id, full_name: item.customer_name, phone: item.customer_phone ?? "", email: item.customer_email, company_id: companyId, notes: item.notes }).select("id").single(); if (error) throw error; customerId = data.id; customers++; }
        else if (row.resolution === "update") { const { error } = await context.supabase.from("customers").update({ ...(item.customer_email ? { email: item.customer_email } : {}), ...(item.notes ? { notes: item.notes } : {}), ...(companyId ? { company_id: companyId } : {}) }).eq("id", customerId).eq("organization_id", context.organization.id); if (error) throw error; updated++; }
      }
      let documentId: string | null = null;
      if (item.document_type && item.document_number && item.expiry_date) {
        const { data: existingType } = await context.supabase.from("organization_document_types").select("id").eq("organization_id", context.organization.id).ilike("name", item.document_type).maybeSingle();
        let typeId = existingType?.id;
        if (!typeId) { const { data, error } = await context.supabase.from("organization_document_types").insert({ organization_id: context.organization.id, name: item.document_type }).select("id").single(); if (error) throw error; typeId = data.id; }
        const { data: existing } = await context.supabase.from("documents").select("id").eq("organization_id", context.organization.id).eq("document_number", item.document_number).maybeSingle();
        documentId = existing?.id ?? null;
        if (!documentId) { const { data, error } = await context.supabase.from("documents").insert({ organization_id: context.organization.id, document_type_id: typeId, customer_id: customerId, company_id: companyId, document_number: item.document_number, display_name: `${item.document_type} ${item.document_number}`, issued_on: item.issue_date, expires_on: item.expiry_date, notes: item.notes }).select("id").single(); if (error) throw error; documentId = data.id; documents++; }
        else if (row.resolution === "update") { const { error } = await context.supabase.from("documents").update({ expires_on: item.expiry_date, ...(item.issue_date ? { issued_on: item.issue_date } : {}), ...(item.notes ? { notes: item.notes } : {}) }).eq("id", documentId).eq("organization_id", context.organization.id); if (error) throw error; updated++; }
      }
      await context.supabase.from("import_job_rows").update({ status: "imported", customer_id: customerId, company_id: companyId, document_id: documentId, imported_at: new Date().toISOString() }).eq("id", row.id).eq("organization_id", context.organization.id);
    } catch {
      failed++; await context.supabase.from("import_job_rows").update({ status: "failed", issues: ["This row could not be imported. Review its mapped values and try again."] }).eq("id", row.id).eq("organization_id", context.organization.id);
    }
  }
  const processed = (rows ?? []).length; const { count: remaining } = await context.supabase.from("import_job_rows").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).eq("organization_id", context.organization.id).in("status", ["ready", "possible_duplicate"]).in("resolution", ["create", "update"]); const done = !remaining;
  const { count: skipped } = await context.supabase.from("import_job_rows").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).eq("organization_id", context.organization.id).eq("status", "skipped");
  await context.supabase.from("import_jobs").update({ status: done ? (failed ? "completed_with_errors" : "completed") : "importing", processed_rows: job.processed_rows + processed, customers_created: job.customers_created + customers, companies_created: job.companies_created + companies, documents_created: job.documents_created + documents, records_updated: job.records_updated + updated, records_skipped: skipped ?? job.records_skipped, records_failed: job.records_failed + failed, completed_at: done ? new Date().toISOString() : null }).eq("id", jobId).eq("organization_id", context.organization.id);
  return NextResponse.json({ processed, remaining: remaining ?? 0, customers, companies, documents, updated, failed, complete: done });
}
