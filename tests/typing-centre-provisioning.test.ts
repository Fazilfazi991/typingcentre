import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isDuplicateAuthEmail, typingCentreProvisionSchema } from "@/lib/platform/provisioning";

const validInput = { name: "QA Typing Centre", email: "OWNER@EXAMPLE.COM", ownerName: "QA Owner", ownerMobile: "+971501234567", phone: "+971401234567", location: "Dubai", billing: "annual", state: "active", password: "CorrectHorseBattery1", confirmPassword: "CorrectHorseBattery1" };
const action = readFileSync("src/app/admin/actions.ts", "utf8");
const form = readFileSync("src/app/admin/typing-centres/new/typing-centre-provision-form.tsx", "utf8");

describe("typing centre direct account provisioning", () => {
  it("requires a matching initial password and normalizes the owner email", () => {
    const result = typingCentreProvisionSchema.safeParse(validInput);
    expect(result.success && result.data.email).toBe("owner@example.com");
    expect(typingCentreProvisionSchema.safeParse({ ...validInput, confirmPassword: "DifferentPassword1" }).success).toBe(false);
    expect(typingCentreProvisionSchema.safeParse({ ...validInput, password: "short", confirmPassword: "short" }).success).toBe(false);
  });

  it("classifies duplicate Auth emails without returning provider details", () => {
    expect(isDuplicateAuthEmail({ message: "User already registered" })).toBe(true);
    expect(isDuplicateAuthEmail({ code: "email_exists" })).toBe(true);
    expect(isDuplicateAuthEmail({ message: "Service unavailable" })).toBe(false);
  });

  it("uses a confirmed server-side Auth account rather than an invitation", () => {
    expect(action).toContain("auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true");
    expect(action).not.toContain("inviteUserByEmail");
    expect(action).not.toContain("/auth/callback?next=/onboarding/setup");
    expect(action).toContain("if (!owner.email_confirmed_at)");
  });

  it("creates the canonical tenant records and cleans up only a newly created Auth user on failure", () => {
    expect(action).toContain('from("profiles").upsert');
    expect(action).toContain('from("organizations").insert');
    expect(action).toContain('from("organization_memberships").insert');
    expect(action).toContain('from("organization_subscriptions").insert');
    expect(action).toContain('from("organization_usage_counters").insert');
    expect(action).toContain("canonicalSubscription(input.billing)");
    expect(action).toContain("onboarding_completed_at: today()");
    expect(action).toContain('from("organizations").delete().eq("id", organizationId)');
    expect(action).toContain("auth.admin.deleteUser(owner.id)");
    expect(action).toContain('event: "typing_centre_provision_rollback_incomplete"');
    expect(action).toContain('after: { name: input.name, ownerEmail: input.email, plan: subscription.plan }');
  });

  it("shows password confirmation and a non-secret success state", () => {
    expect(form).toContain('name="password"');
    expect(form).toContain('name="confirmPassword"');
    expect(form).toContain("Create Typing Centre");
    expect(form).toContain("Email</dt><dd>Confirmed");
    expect(form).not.toContain("Create and invite owner");
    expect(form).not.toContain("password: state");
  });
});
