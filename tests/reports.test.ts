import { describe, expect, it } from "vitest";
import { csvCell, documentStatus, reportCsv, type ReportDocument } from "@/lib/reports/data";
import { reportFiltersFromSearchParams, reportRangeBounds } from "@/lib/reports/filters";

describe("reports filters and presentation", () => {
  const now = new Date("2026-08-20T08:00:00Z");

  it("uses workspace-local date boundaries for report ranges", () => {
    expect(
      reportRangeBounds(reportFiltersFromSearchParams({ range: "7d" }), now, "Asia/Dubai"),
    ).toEqual({ start: "2026-08-20", end: "2026-08-28" });
    expect(
      reportRangeBounds(
        reportFiltersFromSearchParams({ range: "custom", start: "2026-08-22", end: "2026-08-24" }),
        now,
        "America/New_York",
      ),
    ).toEqual({ start: "2026-08-22", end: "2026-08-25" });
  });

  it("keeps expiry buckets exclusive and exports canonical document rows safely", () => {
    const base: Omit<ReportDocument, "expires_on"> = {
      id: "doc-1",
      document_number: 'A,"42"',
      status: "valid",
      customer_id: "customer-1",
      company_id: null,
      customers: { full_name: "Aisha Rahman" },
      companies: null,
      organization_document_types: { name: "Passport" },
    };
    expect(documentStatus({ ...base, expires_on: "2026-08-19" }, now, "Asia/Dubai")).toBe(
      "Expired",
    );
    expect(documentStatus({ ...base, expires_on: "2026-08-20" }, now, "Asia/Dubai")).toBe(
      "Expiring today",
    );
    expect(documentStatus({ ...base, expires_on: "2026-08-27" }, now, "Asia/Dubai")).toBe(
      "Next 7 days",
    );
    expect(documentStatus({ ...base, expires_on: "2026-09-19" }, now, "Asia/Dubai")).toBe(
      "Next 30 days",
    );
    expect(documentStatus({ ...base, expires_on: "2026-09-20" }, now, "Asia/Dubai")).toBe("Active");
    expect(csvCell('A,"42"')).toBe('"A,""42"""');
    expect(reportCsv([{ ...base, expires_on: "2026-08-20" }], now, "Asia/Dubai")).toContain(
      '"A,""42"""',
    );
  });
});
