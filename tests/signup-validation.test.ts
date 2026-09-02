import { describe, expect, it } from "vitest";
import { signupSchema } from "@/lib/auth/validation";

describe("signup validation", () => {
  it("normalizes a valid email and accepts a strong matching password", () => {
    const result = signupSchema.parse({
      email: "  OWNER@EXAMPLE.COM ",
      password: "correct-horse-42",
      confirmPassword: "correct-horse-42",
      displayName: "New Owner",
    });
    expect(result.email).toBe("owner@example.com");
  });

  it("rejects short or mismatched passwords", () => {
    expect(signupSchema.safeParse({ email: "owner@example.com", password: "short", confirmPassword: "short", displayName: "New Owner" }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "owner@example.com", password: "correct-horse-42", confirmPassword: "different-pass-42", displayName: "New Owner" }).success).toBe(false);
  });
});
