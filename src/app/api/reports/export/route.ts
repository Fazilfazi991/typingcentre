import { NextResponse } from "next/server";
import { getReportData, reportCsv } from "@/lib/reports/data";
import { reportFiltersFromSearchParams } from "@/lib/reports/filters";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceContext("/reports");
  if (!context) return NextResponse.json({ error: "Workspace unavailable" }, { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { documents } = await getReportData(context, reportFiltersFromSearchParams(params));
  return new NextResponse(reportCsv(documents, new Date(), context.organization.timezone), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=reports.csv",
      "Cache-Control": "no-store",
    },
  });
}
