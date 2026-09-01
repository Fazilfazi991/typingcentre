import { describe, expect, it } from "vitest";
import { followUpSchema } from "@/features/crm/schemas";

// Regression: ISSUE-001 — follow-up actions converted an already-normalized ISO timestamp twice
// Found by /qa on 2026-09-02
// Report: .gstack/qa-reports/qa-report-typingcentre-preview-2026-09-02.md
describe("follow-up datetime normalization", () => {
  it("converts a native datetime-local value exactly once before persistence", () => {
    const parsed = followUpSchema.parse({
      customerId: "7e18e713-93dd-4c3f-9b12-3a2f8868d9c0",
      companyId: "",
      dueAt: "2026-09-03T10:00",
      note: "Synthetic QA follow-up",
    });

    expect(parsed.dueAt).toBe("2026-09-03T06:00:00.000Z");
  });
});
