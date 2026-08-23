import { describe, expect, it } from "vitest";
import { canonicalSubscription, billingLabel, planLabel } from "@/lib/platform/subscription-pricing";
import { readFileSync } from "node:fs";

describe("Note It subscription pricing", () => {
  it("derives canonical monthly pricing without client values", () => {
    expect(canonicalSubscription("monthly", new Date("2026-08-23T00:00:00Z"))).toMatchObject({ plan: "starter", amount: 100, billing_cycle: "monthly", current_period_ends_at: "2026-09-23T23:59:59.000Z" });
  });
  it("maps annual to thirteen months and AED 1,000", () => {
    expect(canonicalSubscription("annual", new Date("2026-08-23T00:00:00Z"))).toMatchObject({ plan: "starter", amount: 1000, billing_cycle: "yearly", current_period_ends_at: "2027-09-23T23:59:59.000Z" });
  });
  it("renders canonical and legacy values safely", () => {
    expect(planLabel("starter")).toBe("Note It"); expect(planLabel("business")).toBe("business"); expect(billingLabel("yearly")).toBe("Annual · 13 months"); expect(billingLabel("custom")).toBe("custom");
  });
  it("offers only canonical billing in the new-account form", () => {
    const page = readFileSync("src/app/admin/typing-centres/new/typing-centre-provision-form.tsx", "utf8");
    expect(page).toContain('name="billing"'); expect(page).toContain("AED 100 / month"); expect(page).toContain("AED 1,000 / 13 months"); expect(page).toContain("Save AED 300");
    for (const legacy of ['<option value="starter"', '<option value="business"', '<option value="pro"', 'value="quarterly"', 'value="custom"', 'name="plan"', 'name="amount"', 'name="renewal"']) expect(page).not.toContain(legacy);
  });
});
