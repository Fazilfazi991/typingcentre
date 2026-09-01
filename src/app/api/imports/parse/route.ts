import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { IMPORT_MAX_ROWS, parseImportFile } from "@/lib/imports/parser";
import { isDemoContext } from "@/lib/demo/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to import data." }, { status: 403 });
  if (isDemoContext(context)) return NextResponse.json({ error: "Data import is disabled in Demo Mode." }, { status: 403 });
  const body = await request.formData();
  const file = body.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV or XLSX file." }, { status: 400 });
  try {
    const parsed = await parseImportFile(file);
    const totalRows = parsed.sheets.reduce((total, sheet) => total + sheet.rows.length, 0);
    if (!totalRows) return NextResponse.json({ error: "The file does not contain any data rows." }, { status: 400 });
    const { data: job, error: jobError } = await context.supabase.from("import_jobs").insert({ organization_id: context.organization.id, created_by: context.user.id, file_name: file.name.slice(0, 255), source_format: parsed.format, status: "uploaded", total_rows: totalRows }).select("id").single();
    if (jobError || !job) throw new Error("Could not create the import job.");
    const rows = parsed.sheets.flatMap((sheet) => sheet.rows.map((source_data, index) => ({ import_job_id: job.id, organization_id: context.organization.id, source_sheet_name: sheet.name, row_number: index + 2, source_data })));
    for (let start = 0; start < rows.length; start += 500) {
      const { error } = await context.supabase.from("import_job_rows").insert(rows.slice(start, start + 500));
      if (error) throw new Error("Could not store the import preview.");
    }
    return NextResponse.json({ jobId: job.id, format: parsed.format, sheets: parsed.sheets.map((sheet) => ({ name: sheet.name, headers: sheet.headers, rowCount: sheet.rows.length, preview: sheet.rows.slice(0, 5) })), limit: IMPORT_MAX_ROWS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The file could not be read." }, { status: 400 });
  }
}
