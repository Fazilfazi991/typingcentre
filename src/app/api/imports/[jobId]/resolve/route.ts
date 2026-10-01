import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoContext } from "@/lib/demo/guard";
import { resolveImportJob } from "@/lib/imports/pipeline";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const context = await getWorkspaceContext("/imports/new");
  if (!context || !["owner", "admin"].includes(context.membership.role)) return NextResponse.json({ error: "You are not allowed to resolve duplicates." }, { status: 403 });
  if (isDemoContext(context)) return NextResponse.json({ error: "Use the fictional sample import in Demo Mode." }, { status: 403 });
  return resolveImportJob(request, context, (await params).jobId);
}
