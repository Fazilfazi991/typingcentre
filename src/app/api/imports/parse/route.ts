import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { stageImportFile } from "@/lib/imports/stage";
import { isDemoContext } from "@/lib/demo/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to import data." }, { status: 403 });
  if (isDemoContext(context)) return NextResponse.json({ error: "Data import is disabled in Demo Mode." }, { status: 403 });
  const body = await request.formData();
  const file = body.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV or XLSX file." }, { status: 400 });
  return stageImportFile(context, file);
}
