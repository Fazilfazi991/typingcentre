import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { canUseDemoImport, getDemoImport } from "@/lib/imports/demo";
import {
  DEMO_IMPORT_FILE,
  DEMO_IMPORT_MAPPING,
  demoImportCsv,
  demoImportId,
  normalizedDemoRow,
} from "@/lib/imports/demo-sample";
import { stageImportFile } from "@/lib/imports/stage";
import { validateImportJob, resolveImportJob, executeImportJob } from "@/lib/imports/pipeline";
import { resetDemoWorkspace } from "@/lib/demo/reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const internalRequest = (body: unknown) =>
  new Request("https://note-it.internal/sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export async function POST(request: Request) {
  const context = await getWorkspaceContext("/imports/new");
  if (!canUseDemoImport(context))
    return json(
      { error: "The sample import is only available in the configured Demo workspace." },
      403,
    );
  try {
    // Input is an action only. No file, row data, mapping, job ID, or organization ID comes from the visitor.
    if (!request.headers.get("content-type")?.includes("application/json"))
      return json({ error: "Only the fictional sample is accepted." }, 400);
    const text = await request.text();
    if (text.length > 100) return json({ error: "Only a sample action is accepted." }, 400);
    const body = JSON.parse(text);
    if (
      !body ||
      typeof body !== "object" ||
      Object.keys(body).length !== 1 ||
      !["try", "validate", "skip", "import", "reset"].includes(body.action)
    )
      return json({ error: "Choose a valid sample action." }, 400);
    if (body.action === "reset") {
      await resetDemoWorkspace(context.organization.id);
      return json({ sample: null });
    }
    let sample = await getDemoImport(context);
    if (body.action === "try") {
      if (!sample) {
        const staged = await stageImportFile(
          context,
          new File([demoImportCsv()], DEMO_IMPORT_FILE, { type: "text/csv" }),
          demoImportId(context.organization.id),
        );
        if (!staged.ok) return staged;
        sample = await getDemoImport(context);
      }
      return json({ sample });
    }
    if (!sample) return json({ error: "Choose Try Sample Import first." }, 409);
    if (["completed", "completed_with_errors"].includes(sample.job.status)) return json({ sample });
    if (sample.job.status === "importing")
      return json(
        { error: "This sample import is already running. Refresh to see its result." },
        409,
      );
    let result: Response;
    if (body.action === "validate") {
      result = await validateImportJob(
        internalRequest({ sheetName: "CSV", mapping: DEMO_IMPORT_MAPPING }),
        context,
        sample.job.id,
      );
    } else if (body.action === "skip") {
      await getDemoImport(context, true);
      const rowIds = sample.rows
        .filter((row) => ["possible_duplicate", "invalid"].includes(row.status))
        .map((row) => row.id);
      if (!rowIds.length) return json({ sample });
      result = await resolveImportJob(
        internalRequest({ rowIds, resolution: "skip" }),
        context,
        sample.job.id,
      );
    } else {
      sample = await getDemoImport(context, true);
      if (
        !sample ||
        sample.rows.some((row) => ["possible_duplicate", "invalid"].includes(row.status))
      )
        return json({ error: "Skip duplicates and the row needing review before importing." }, 409);
      // A single deterministic job and an atomic claim prevent concurrent/repeated visitors from multiplying records.
      const { data: claim, error } = await context.supabase
        .from("import_jobs")
        .update({ status: "importing" })
        .eq("id", sample.job.id)
        .eq("organization_id", context.organization.id)
        .eq("status", "ready")
        .select("id")
        .maybeSingle();
      if (error || !claim)
        return json({ error: "This sample is already running or needs validation." }, 409);
      const trustedRows = new Map(
        Array.from(
          { length: 8 },
          (_, index) =>
            [
              demoImportId(context.organization.id, `row-${index}`),
              normalizedDemoRow(index),
            ] as const,
        ),
      );
      result = await executeImportJob(internalRequest({}), context, sample.job.id, trustedRows);
    }
    if (!result.ok) return result;
    return json({ sample: await getDemoImport(context) });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "The sample import could not be completed.",
      },
      400,
    );
  }
}
