import { NextResponse } from "next/server";
import { getActivePlatformAdmin } from "@/lib/platform/auth";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";
import { QA_TEMPLATE_NAMES, safeTemplate } from "@/lib/whatsapp/qa-console";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getActivePlatformAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const inspection = await inspectWhatsAppManagement(QA_TEMPLATE_NAMES);
    return NextResponse.json(
      {
        graphApiVersion: inspection.graphApiVersion,
        wabaId: inspection.wabaId,
        permissions: inspection.permissions,
        paginationComplete: inspection.paginationComplete,
        returnedTemplateCount: inspection.returnedTemplateCount,
        templates: inspection.matchingTemplates.map(safeTemplate),
        error: inspection.error,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "WhatsApp template inspection failed." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
