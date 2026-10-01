import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env.server";
import { resetDemoWorkspace } from "@/lib/demo/reset";

export const runtime = "nodejs";
const DEMO_SLUG = "note-it-demo";

function log(event: string, details: Record<string, unknown> = {}) {
  process.stdout.write(`${JSON.stringify({ event, ...details })}\n`);
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!['production', 'preview'].includes(process.env.VERCEL_ENV ?? '') || env.DEMO_ORGANIZATION_SLUG !== DEMO_SLUG) {
    log("demo_reset_rejected", { reason: "environment_guard" });
    return NextResponse.json({ error: "Demo reset guard rejected this environment." }, { status: 409 });
  }
  try { return NextResponse.json(await resetDemoWorkspace()); }
  catch { return NextResponse.json({ error: "Demo reset failed. The next scheduled run will retry safely." }, { status: 500 }); }
}
