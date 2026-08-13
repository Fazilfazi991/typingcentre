import { describe, expect, it } from "vitest";
import { loginPathFor, safeNext } from "@/lib/auth/validation";

describe("renewals authentication destination", () => {
  it("preserves the WhatsApp deep link through the login query", () => {
    expect(loginPathFor("/renewals?range=today")).toBe("/login?next=%2Frenewals%3Frange%3Dtoday");
    expect(loginPathFor("/renewals?range=expired")).toBe("/login?next=%2Frenewals%3Frange%3Dexpired");
    expect(safeNext("/renewals?range=7d")).toBe("/renewals?range=7d");
  });

  it("never accepts an external post-login destination", () => {
    expect(loginPathFor("https://evil.example/renewals")).toBe("/login");
    expect(safeNext("//evil.example/renewals")).toBeUndefined();
  });
});
