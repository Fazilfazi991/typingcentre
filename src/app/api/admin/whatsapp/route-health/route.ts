import { NextResponse } from "next/server";
import { getActivePlatformAdmin } from "@/lib/platform/auth";
import { inspectRouteHealth, QA_CTA_PATHS } from "@/lib/whatsapp/route-health";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getActivePlatformAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const routes = await Promise.all(QA_CTA_PATHS.map((path) => inspectRouteHealth(path)));
  return NextResponse.json({ routes }, { headers: { "Cache-Control": "no-store" } });
}
