import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { normalizePhone, parseImportDate } from "@/lib/imports/parser";
import { isDemoContext } from "@/lib/demo/guard";

const fields = ["customer_name", "company_name", "customer_phone", "customer_email", "document_type", "document_number", "issue_date", "expiry_date", "notes"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string; rowId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to edit this import." }, { status: 403 });
  if (isDemoContext(context)) return NextResponse.json({ error: "Data import is disabled in Demo Mode." }, { status: 403 });
  const { jobId, rowId } = await params; const body = await request.json() as Record<string, unknown>;
  const { data: row } = await context.supabase.from("import_job_rows").select("id,normalized_data").eq("id", rowId).eq("import_job_id", jobId).eq("organization_id", context.organization.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Import row not found." }, { status: 404 });
  const next = { ...(row.normalized_data as Record<string, string | null>) }; for (const field of fields) if (field in body) next[field] = String(body[field] ?? "").trim() || null;
  next.customer_phone = next.customer_phone ? normalizePhone(next.customer_phone) : null;
  const expiry = parseImportDate(next.expiry_date ?? ""); const issues: string[] = [];
  if (!next.customer_name && !next.company_name) issues.push("Customer or company name is required.");
  if (body.customer_phone && !next.customer_phone) issues.push("Customer phone is not valid.");
  if (next.document_number || next.document_type || next.expiry_date) { if (!next.document_number || !next.document_type || !expiry.value || expiry.ambiguous) issues.push(expiry.ambiguous ? "Expiry date is ambiguous. Use YYYY-MM-DD." : "Document type, number, and valid expiry date are required together."); }
  next.expiry_date = expiry.value;
  const duplicate = next.customer_phone ? await context.supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).eq("phone", next.customer_phone) : { count: 0 };
  const status = issues.length ? "invalid" : (duplicate.count ?? 0) > 0 ? "possible_duplicate" : "ready";
  const { error } = await context.supabase.from("import_job_rows").update({ normalized_data: next, status, issues, duplicate_of: status === "possible_duplicate" ? ["matching customer phone"] : [], resolution: status === "ready" ? "create" : null }).eq("id", rowId).eq("organization_id", context.organization.id);
  if (error) return NextResponse.json({ error: "Could not save the staged row." }, { status: 400 });
  return NextResponse.json({ status, issues, normalized: next });
}
