export type CanonicalBilling = "monthly" | "annual";

export const NOTE_IT_PLAN = "starter" as const;
export const NOTE_IT_PRICING = {
  monthly: { amount: 100, months: 1, storedCycle: "monthly" as const },
  annual: { amount: 1000, months: 13, storedCycle: "yearly" as const, saving: 300 },
} as const;

export function canonicalSubscription(billing: CanonicalBilling, startsAt: Date = new Date()) {
  const pricing = NOTE_IT_PRICING[billing];
  const end = new Date(Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + pricing.months, startsAt.getUTCDate(), 23, 59, 59));
  return { plan: NOTE_IT_PLAN, amount: pricing.amount, billing_cycle: pricing.storedCycle, current_period_starts_at: startsAt.toISOString(), current_period_ends_at: end.toISOString() };
}

export function billingLabel(cycle?: string | null) { return cycle === "yearly" ? "Annual · 13 months" : cycle === "monthly" ? "Monthly" : cycle ?? "—"; }
export function planLabel(plan?: string | null) { return plan === NOTE_IT_PLAN ? "Note It" : plan ?? "—"; }
