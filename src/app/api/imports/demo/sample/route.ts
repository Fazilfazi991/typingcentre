import { demoImportCsv, DEMO_IMPORT_FILE } from "@/lib/imports/demo-sample";

export function GET() {
  return new Response(demoImportCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${DEMO_IMPORT_FILE}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
