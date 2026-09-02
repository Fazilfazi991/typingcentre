import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoContext } from "@/lib/demo/guard";

type Resolution = "create" | "skip" | "update";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to resolve duplicates." }, { status: 403 });
  if (isDemoContext(context)) return NextResponse.json({ error: "Data import is disabled in Demo Mode." }, { status: 403 });
  const { jobId } = await params;
  const body = await request.json() as { rowIds?: string[]; resolution?: Resolution };
  if (!body.rowIds?.length || !body.resolution || !["create", "skip", "update"].includes(body.resolution)) return NextResponse.json({ error: "Choose records and a valid resolution." }, { status: 400 });
  const { data: job } = await context.supabase.from("import_jobs").select("id,status").eq("id", jobId).eq("organization_id", context.organization.id).maybeSingle();
  if (!job || job.status !== "ready") return NextResponse.json({ error: "This import is no longer available for review." }, { status: 409 });
  const patch = body.resolution === "skip" ? { status: "skipped" as const, resolution: "skip" } : { resolution: body.resolution };
  const eligibleStatuses = body.resolution === "skip" ? ["possible_duplicate", "invalid", "failed"] : ["possible_duplicate"];
  const { error } = await context.supabase.from("import_job_rows").update(patch).eq("import_job_id", jobId).eq("organization_id", context.organization.id).in("id", body.rowIds).in("status", eligibleStatuses);
  if (error) return NextResponse.json({ error: "We could not save the duplicate decision." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
