import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { normalizePhone, parseImportDate } from "@/lib/imports/parser";

type Mapping = Record<string, string>;
const get = (source: Record<string, unknown>, mapping: Mapping, field: string) => String(source[Object.keys(mapping).find((header) => mapping[header] === field) ?? ""] ?? "").trim();
const inferredDocumentType = (mapping: Mapping) => {
  const headers = Object.keys(mapping).filter((header) => ["document_number", "expiry_date"].includes(mapping[header] ?? "")).join(" ").toLowerCase();
  if (headers.includes("passport")) return "Passport";
  if (headers.includes("emirates") || /\beid\b/.test(headers)) return "Emirates ID";
  if (headers.includes("visa")) return "Visa";
  if (headers.includes("trade licen") || headers.includes("trade licen")) return "Trade Licence";
  return "";
};

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to import data." }, { status: 403 });
  const { jobId } = await params; const { mapping, sheetName } = await request.json() as { mapping: Mapping; sheetName: string };
  if (!mapping || !sheetName) return NextResponse.json({ error: "Choose a sheet and map the columns first." }, { status: 400 });
  const { data: job } = await context.supabase.from("import_jobs").select("id").eq("id", jobId).eq("organization_id", context.organization.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  const { data: rows, error } = await context.supabase.from("import_job_rows").select("id,source_data").eq("import_job_id", jobId).eq("organization_id", context.organization.id).eq("source_sheet_name", sheetName).order("row_number");
  if (error) return NextResponse.json({ error: "Could not load the import rows." }, { status: 400 });
  const inferredType = inferredDocumentType(mapping);
  const documentNumbers = (rows ?? []).map((row: any) => get(row.source_data, mapping, "document_number")).filter(Boolean);
  const phones = (rows ?? []).map((row: any) => normalizePhone(get(row.source_data, mapping, "customer_phone"))).filter(Boolean);
  const [{ data: existingDocuments }, { data: existingCustomers }] = await Promise.all([
    documentNumbers.length ? context.supabase.from("documents").select("id,document_number").eq("organization_id", context.organization.id).in("document_number", documentNumbers) : Promise.resolve({ data: [] }),
    phones.length ? context.supabase.from("customers").select("id,phone").eq("organization_id", context.organization.id).in("phone", phones) : Promise.resolve({ data: [] }),
  ]);
  const existingDocumentNumbers = new Set((existingDocuments ?? []).map((item: any) => item.document_number)); const existingPhones = new Set((existingCustomers ?? []).map((item: any) => item.phone)); const seenDocuments = new Set<string>(); let ready = 0, invalid = 0, duplicates = 0;
  for (const row of rows ?? []) {
    const source = row.source_data as Record<string, unknown>; const customerName = get(source, mapping, "customer_name"); const companyName = get(source, mapping, "company_name"); const documentNumber = get(source, mapping, "document_number"); const documentType = get(source, mapping, "document_type") || inferredType; const expiry = parseImportDate(get(source, mapping, "expiry_date")); const phone = normalizePhone(get(source, mapping, "customer_phone")); const issues: string[] = [];
    if (!customerName && !companyName) issues.push("Customer or company name is required.");
    if (get(source, mapping, "customer_phone") && !phone) issues.push("Customer phone is not a valid international or UAE number.");
    if ((documentNumber || documentType || get(source, mapping, "expiry_date")) && (!documentType || !documentNumber || !expiry.value || expiry.ambiguous)) issues.push(expiry.ambiguous ? "Expiry date is ambiguous. Use YYYY-MM-DD." : "Document type, number, and valid expiry date are required together.");
    const duplicate = documentNumber && (existingDocumentNumbers.has(documentNumber) || seenDocuments.has(documentNumber)); if (documentNumber) seenDocuments.add(documentNumber);
    const status = issues.length ? "invalid" : duplicate || (phone && existingPhones.has(phone)) ? "possible_duplicate" : "ready";
    if (status === "ready") ready++; else if (status === "invalid") invalid++; else duplicates++;
    const normalized_data = { customer_name: customerName || null, customer_phone: phone, customer_email: get(source, mapping, "customer_email").toLowerCase() || null, company_name: companyName || null, company_phone: normalizePhone(get(source, mapping, "company_phone")), branch: get(source, mapping, "branch") || null, document_type: documentType || null, document_number: documentNumber || null, issue_date: parseImportDate(get(source, mapping, "issue_date")).value, expiry_date: expiry.value, notes: get(source, mapping, "notes") || null };
    await context.supabase.from("import_job_rows").update({ normalized_data, status, issues, duplicate_of: duplicate ? ["matching document number"] : phone && existingPhones.has(phone) ? ["matching customer phone"] : [], resolution: status === "ready" ? "create" : null }).eq("id", row.id).eq("organization_id", context.organization.id);
  }
  await context.supabase.from("import_jobs").update({ status: "ready", sheet_name: sheetName, mapping, total_rows: (rows ?? []).length }).eq("id", jobId).eq("organization_id", context.organization.id);
  const { data: reviewedRows } = await context.supabase.from("import_job_rows").select("id,row_number,source_data,normalized_data,status,issues,resolution").eq("import_job_id", jobId).eq("organization_id", context.organization.id).eq("source_sheet_name", sheetName).order("row_number").limit(100);
  return NextResponse.json({ total: (rows ?? []).length, ready, invalid, duplicates, rows: reviewedRows ?? [] });
}
