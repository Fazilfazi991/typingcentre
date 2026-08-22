import { getWorkspaceContext } from "@/lib/workspace/context";

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return new Response("Not authorized", { status: 403 });
  const { jobId } = await params;
  const { data: rows } = await context.supabase.from("import_job_rows").select("row_number,status,source_data,normalized_data,issues,resolution").eq("import_job_id", jobId).eq("organization_id", context.organization.id).in("status", ["invalid", "failed", "skipped"]).order("row_number");
  const header = ["Source Row", "Status", "Customer Name", "Company Name", "Source Values", "Error Reason", "Resolution"];
  const body = (rows ?? []).map((row: any) => [row.row_number, row.status, row.normalized_data?.customer_name ?? row.source_data?.["Customer Name"] ?? "", row.normalized_data?.company_name ?? row.source_data?.Company ?? "", JSON.stringify(row.source_data ?? {}), Array.isArray(row.issues) ? row.issues.join("; ") : "", row.resolution ?? ""].map(quote).join(","));
  return new Response([header.map(quote).join(","), ...body].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="import-${jobId}-errors.csv"`, "Cache-Control": "no-store" } });
}
