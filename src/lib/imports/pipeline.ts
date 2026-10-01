import "server-only";
import { NextResponse } from "next/server";
import type { WorkspaceContext } from "@/lib/workspace/context";
import { normalizePhone, parseImportDate } from "./parser";

type Mapping = Record<string, string>;
const get = (source: Record<string, unknown>, mapping: Mapping, field: string) =>
  String(
    source[Object.keys(mapping).find((header) => mapping[header] === field) ?? ""] ?? "",
  ).trim();
const inferredDocumentType = (mapping: Mapping) => {
  const headers = Object.keys(mapping)
    .filter((header) => ["document_number", "expiry_date"].includes(mapping[header] ?? ""))
    .join(" ")
    .toLowerCase();
  if (headers.includes("passport")) return "Passport";
  if (headers.includes("emirates") || /\beid\b/.test(headers)) return "Emirates ID";
  if (headers.includes("visa")) return "Visa";
  if (headers.includes("trade licen") || headers.includes("trade licen")) return "Trade Licence";
  return "";
};

export async function validateImportJob(
  request: Request,
  context: WorkspaceContext,
  jobId: string,
) {
  const { mapping, sheetName } = (await request.json()) as { mapping: Mapping; sheetName: string };
  if (!mapping || !sheetName)
    return NextResponse.json(
      { error: "Choose a sheet and map the columns first." },
      { status: 400 },
    );
  const { data: job } = await context.supabase
    .from("import_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  const { data: rows, error } = await context.supabase
    .from("import_job_rows")
    .select("id,source_data")
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .eq("source_sheet_name", sheetName)
    .order("row_number");
  if (error)
    return NextResponse.json({ error: "Could not load the import rows." }, { status: 400 });
  const inferredType = inferredDocumentType(mapping);
  const documentNumbers = (rows ?? [])
    .map((row: any) => get(row.source_data, mapping, "document_number"))
    .filter(Boolean);
  const phones = (rows ?? [])
    .map((row: any) => normalizePhone(get(row.source_data, mapping, "customer_phone")))
    .filter(Boolean);
  const [{ data: existingDocuments }, { data: existingCustomers }] = await Promise.all([
    documentNumbers.length
      ? context.supabase
          .from("documents")
          .select("id,document_number")
          .eq("organization_id", context.organization.id)
          .in("document_number", documentNumbers)
      : Promise.resolve({ data: [] }),
    phones.length
      ? context.supabase
          .from("customers")
          .select("id,phone")
          .eq("organization_id", context.organization.id)
          .in("phone", phones)
      : Promise.resolve({ data: [] }),
  ]);
  const existingDocumentNumbers = new Set(
    (existingDocuments ?? []).map((item: any) => item.document_number),
  );
  const existingPhones = new Set((existingCustomers ?? []).map((item: any) => item.phone));
  const seenDocuments = new Set<string>();
  let ready = 0,
    invalid = 0,
    duplicates = 0;
  for (const row of rows ?? []) {
    const source = row.source_data as Record<string, unknown>;
    const customerName = get(source, mapping, "customer_name");
    const companyName = get(source, mapping, "company_name");
    const documentNumber = get(source, mapping, "document_number");
    const documentType = get(source, mapping, "document_type") || inferredType;
    const expiry = parseImportDate(get(source, mapping, "expiry_date"));
    const phone = normalizePhone(get(source, mapping, "customer_phone"));
    const issues: string[] = [];
    if (!customerName && !companyName) issues.push("Customer or company name is required.");
    if (get(source, mapping, "customer_phone") && !phone)
      issues.push("Customer phone is not a valid international or UAE number.");
    if (
      (documentNumber || documentType || get(source, mapping, "expiry_date")) &&
      (!documentType || !documentNumber || !expiry.value || expiry.ambiguous)
    )
      issues.push(
        expiry.ambiguous
          ? "Expiry date is ambiguous. Use YYYY-MM-DD."
          : "Document type, number, and valid expiry date are required together.",
      );
    const duplicate =
      documentNumber &&
      (existingDocumentNumbers.has(documentNumber) || seenDocuments.has(documentNumber));
    if (documentNumber) seenDocuments.add(documentNumber);
    const status = issues.length
      ? "invalid"
      : duplicate || (phone && existingPhones.has(phone))
        ? "possible_duplicate"
        : "ready";
    if (status === "ready") ready++;
    else if (status === "invalid") invalid++;
    else duplicates++;
    const normalized_data = {
      customer_name: customerName || null,
      customer_phone: phone,
      customer_email: get(source, mapping, "customer_email").toLowerCase() || null,
      company_name: companyName || null,
      company_phone: normalizePhone(get(source, mapping, "company_phone")),
      branch: get(source, mapping, "branch") || null,
      document_type: documentType || null,
      document_number: documentNumber || null,
      issue_date: parseImportDate(get(source, mapping, "issue_date")).value,
      expiry_date: expiry.value,
      notes: get(source, mapping, "notes") || null,
    };
    await context.supabase
      .from("import_job_rows")
      .update({
        normalized_data,
        status,
        issues,
        duplicate_of: duplicate
          ? ["matching document number"]
          : phone && existingPhones.has(phone)
            ? ["matching customer phone"]
            : [],
        resolution: status === "ready" ? "create" : null,
      })
      .eq("id", row.id)
      .eq("organization_id", context.organization.id);
  }
  await context.supabase
    .from("import_jobs")
    .update({ status: "ready", sheet_name: sheetName, mapping, total_rows: (rows ?? []).length })
    .eq("id", jobId)
    .eq("organization_id", context.organization.id);
  const { data: reviewedRows } = await context.supabase
    .from("import_job_rows")
    .select("id,row_number,source_data,normalized_data,status,issues,resolution")
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .eq("source_sheet_name", sheetName)
    .order("row_number")
    .limit(100);
  return NextResponse.json({
    total: (rows ?? []).length,
    ready,
    invalid,
    duplicates,
    rows: reviewedRows ?? [],
  });
}

const BATCH_SIZE = 100;
export async function executeImportJob(
  _request: Request,
  context: WorkspaceContext,
  jobId: string,
  trustedRows?: ReadonlyMap<string, Record<string, string | null>>,
) {
  const { data: job } = await context.supabase
    .from("import_jobs")
    .select(
      "id,status,processed_rows,customers_created,companies_created,documents_created,records_updated,records_skipped,records_failed",
    )
    .eq("id", jobId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!job || !["ready", "importing"].includes(job.status))
    return NextResponse.json({ error: "Validate the import before starting it." }, { status: 409 });
  await context.supabase
    .from("import_jobs")
    .update({ status: "importing", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("organization_id", context.organization.id);
  const { data: rows } = await context.supabase
    .from("import_job_rows")
    .select("id,normalized_data,resolution,status")
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .in("status", ["ready", "possible_duplicate"])
    .in("resolution", ["create", "update"])
    .order("row_number")
    .limit(BATCH_SIZE);
  let customers = 0,
    companies = 0,
    documents = 0,
    failed = 0,
    updated = 0;
  for (const row of rows ?? []) {
    try {
      const item = trustedRows
        ? trustedRows.get(row.id)
        : (row.normalized_data as Record<string, string | null>);
      if (!item) throw new Error("Only approved sample rows may execute.");
      let customerId: string | null = null;
      let companyId: string | null = null;
      if (item.company_name) {
        const { data: existing } = await context.supabase
          .from("companies")
          .select("id")
          .eq("organization_id", context.organization.id)
          .ilike("name", item.company_name)
          .maybeSingle();
        companyId = existing?.id ?? null;
        if (!companyId) {
          const { data, error } = await context.supabase
            .from("companies")
            .insert({
              organization_id: context.organization.id,
              name: item.company_name,
              contact_phone: item.company_phone,
              city: context.organization.location,
            })
            .select("id")
            .single();
          if (error) throw error;
          companyId = data.id;
          companies++;
        }
      }
      if (item.customer_name) {
        const { data: existing } = item.customer_phone
          ? await context.supabase
              .from("customers")
              .select("id")
              .eq("organization_id", context.organization.id)
              .eq("phone", item.customer_phone)
              .maybeSingle()
          : { data: null };
        customerId = existing?.id ?? null;
        if (!customerId) {
          const { data, error } = await context.supabase
            .from("customers")
            .insert({
              organization_id: context.organization.id,
              full_name: item.customer_name,
              phone: item.customer_phone ?? "",
              email: item.customer_email,
              company_id: companyId,
              notes: item.notes,
            })
            .select("id")
            .single();
          if (error) throw error;
          customerId = data.id;
          customers++;
        } else if (row.resolution === "update") {
          const { error } = await context.supabase
            .from("customers")
            .update({
              ...(item.customer_email ? { email: item.customer_email } : {}),
              ...(item.notes ? { notes: item.notes } : {}),
              ...(companyId ? { company_id: companyId } : {}),
            })
            .eq("id", customerId)
            .eq("organization_id", context.organization.id);
          if (error) throw error;
          updated++;
        }
      }
      let documentId: string | null = null;
      if (item.document_type && item.document_number && item.expiry_date) {
        const { data: existingType } = await context.supabase
          .from("organization_document_types")
          .select("id")
          .eq("organization_id", context.organization.id)
          .ilike("name", item.document_type)
          .maybeSingle();
        let typeId = existingType?.id;
        if (!typeId) {
          const { data, error } = await context.supabase
            .from("organization_document_types")
            .insert({ organization_id: context.organization.id, name: item.document_type })
            .select("id")
            .single();
          if (error) throw error;
          typeId = data.id;
        }
        const { data: existing } = await context.supabase
          .from("documents")
          .select("id")
          .eq("organization_id", context.organization.id)
          .eq("document_number", item.document_number)
          .maybeSingle();
        documentId = existing?.id ?? null;
        if (!documentId) {
          const { data, error } = await context.supabase
            .from("documents")
            .insert({
              organization_id: context.organization.id,
              document_type_id: typeId,
              customer_id: customerId,
              company_id: companyId,
              document_number: item.document_number,
              display_name: `${item.document_type} ${item.document_number}`,
              issued_on: item.issue_date,
              expires_on: item.expiry_date,
              notes: item.notes,
            })
            .select("id")
            .single();
          if (error) throw error;
          documentId = data.id;
          documents++;
        } else if (row.resolution === "update") {
          const { error } = await context.supabase
            .from("documents")
            .update({
              expires_on: item.expiry_date,
              ...(item.issue_date ? { issued_on: item.issue_date } : {}),
              ...(item.notes ? { notes: item.notes } : {}),
            })
            .eq("id", documentId)
            .eq("organization_id", context.organization.id);
          if (error) throw error;
          updated++;
        }
      }
      await context.supabase
        .from("import_job_rows")
        .update({
          status: "imported",
          customer_id: customerId,
          company_id: companyId,
          document_id: documentId,
          imported_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("organization_id", context.organization.id);
    } catch {
      failed++;
      await context.supabase
        .from("import_job_rows")
        .update({
          status: "failed",
          issues: ["This row could not be imported. Review its mapped values and try again."],
        })
        .eq("id", row.id)
        .eq("organization_id", context.organization.id);
    }
  }
  const processed = (rows ?? []).length;
  const { count: remaining } = await context.supabase
    .from("import_job_rows")
    .select("id", { count: "exact", head: true })
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .in("status", ["ready", "possible_duplicate"])
    .in("resolution", ["create", "update"]);
  const done = !remaining;
  const { count: skipped } = await context.supabase
    .from("import_job_rows")
    .select("id", { count: "exact", head: true })
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .eq("status", "skipped");
  await context.supabase
    .from("import_jobs")
    .update({
      status: done ? (failed ? "completed_with_errors" : "completed") : "importing",
      processed_rows: job.processed_rows + processed,
      customers_created: job.customers_created + customers,
      companies_created: job.companies_created + companies,
      documents_created: job.documents_created + documents,
      records_updated: job.records_updated + updated,
      records_skipped: skipped ?? job.records_skipped,
      records_failed: job.records_failed + failed,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", jobId)
    .eq("organization_id", context.organization.id);
  return NextResponse.json({
    processed,
    remaining: remaining ?? 0,
    customers,
    companies,
    documents,
    updated,
    failed,
    complete: done,
  });
}

type Resolution = "create" | "skip" | "update";
export async function resolveImportJob(request: Request, context: WorkspaceContext, jobId: string) {
  const body = (await request.json()) as { rowIds?: string[]; resolution?: Resolution };
  if (
    !body.rowIds?.length ||
    !body.resolution ||
    !["create", "skip", "update"].includes(body.resolution)
  )
    return NextResponse.json({ error: "Choose records and a valid resolution." }, { status: 400 });
  const { data: job } = await context.supabase
    .from("import_jobs")
    .select("id,status")
    .eq("id", jobId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!job || job.status !== "ready")
    return NextResponse.json(
      { error: "This import is no longer available for review." },
      { status: 409 },
    );
  const patch =
    body.resolution === "skip"
      ? { status: "skipped" as const, resolution: "skip" }
      : { resolution: body.resolution };
  const eligibleStatuses =
    body.resolution === "skip"
      ? ["possible_duplicate", "invalid", "failed"]
      : ["possible_duplicate"];
  const { error } = await context.supabase
    .from("import_job_rows")
    .update(patch)
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .in("id", body.rowIds)
    .in("status", eligibleStatuses);
  if (error)
    return NextResponse.json(
      { error: "We could not save the duplicate decision." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
