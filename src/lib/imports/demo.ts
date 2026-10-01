import "server-only";
import type { WorkspaceContext } from "@/lib/workspace/context";
import { isDemoContext } from "@/lib/demo/guard";
import {
  assertDemoSampleRows,
  DEMO_IMPORT_FILE,
  demoImportId,
  type DemoStagedRow,
} from "./demo-sample";

export function canUseDemoImport(context: WorkspaceContext | null): context is WorkspaceContext {
  return Boolean(
    context &&
    isDemoContext(context) &&
    process.env.DEMO_ORGANIZATION_ID &&
    context.organization.id === process.env.DEMO_ORGANIZATION_ID &&
    context.organization.slug === "note-it-demo" &&
    context.organization.status === "active" &&
    context.organization.is_active &&
    context.membership.status === "active" &&
    context.membership.organization_id === context.organization.id &&
    ["owner", "admin"].includes(context.membership.role),
  );
}
export async function getDemoImport(context: WorkspaceContext, normalized = false) {
  const jobId = demoImportId(context.organization.id);
  const { data: job, error } = await context.supabase
    .from("import_jobs")
    .select(
      "id,file_name,source_format,status,total_rows,customers_created,companies_created,documents_created,records_updated,records_skipped,records_failed,mapping,sheet_name",
    )
    .eq("id", jobId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error) throw new Error("Could not load the sample import.");
  if (!job) return null;
  if (job.file_name !== DEMO_IMPORT_FILE || job.source_format !== "csv" || job.total_rows !== 10)
    throw new Error("Only the original fictional sample can be imported in Demo Mode.");
  const { data: rows, error: rowError } = await context.supabase
    .from("import_job_rows")
    .select("id,row_number,source_sheet_name,source_data,normalized_data,status,issues,resolution")
    .eq("import_job_id", jobId)
    .eq("organization_id", context.organization.id)
    .order("row_number");
  if (rowError) throw new Error("Could not load the sample preview.");
  assertDemoSampleRows(
    (rows ?? []) as DemoStagedRow[],
    context.organization.id,
    normalized || job.status !== "uploaded",
  );
  return { job, rows: rows ?? [] };
}
