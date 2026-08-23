import { describe, expect, it } from "vitest";
import { recoveryRedirectUrl } from "@/lib/auth/recovery-origin";

describe("recovery redirect origin", () => {
  it("uses the current canonical production origin", () => {
    expect(recoveryRedirectUrl(new Headers({ origin: "https://www.noteitapp.com" }), "https://noteitapp.com")).toBe(
      "https://www.noteitapp.com/auth/callback?next=/reset-password",
    );
  });

  it("uses the current trusted Vercel preview origin", () => {
    expect(recoveryRedirectUrl(new Headers({ origin: "https://typingcentre-f07sddtix-faziils-projects.vercel.app" }), "https://www.noteitapp.com")).toBe(
      "https://typingcentre-f07sddtix-faziils-projects.vercel.app/auth/callback?next=/reset-password",
    );
  });

  it("uses a trusted forwarded preview origin when Origin is unavailable", () => {
    expect(recoveryRedirectUrl(new Headers({ "x-forwarded-host": "typingcentre-git-release-admin-console-faziils-projects.vercel.app", "x-forwarded-proto": "https" }), "https://www.noteitapp.com")).toBe(
      "https://typingcentre-git-release-admin-console-faziils-projects.vercel.app/auth/callback?next=/reset-password",
    );
  });

  it("rejects untrusted origins and preserves the configured canonical fallback", () => {
    expect(recoveryRedirectUrl(new Headers({ origin: "https://evil.example" }), "https://www.noteitapp.com")).toBe(
      "https://www.noteitapp.com/auth/callback?next=/reset-password",
    );
    expect(recoveryRedirectUrl(new Headers({ origin: "javascript:alert(1)" }), "https://www.noteitapp.com")).toBe(
      "https://www.noteitapp.com/auth/callback?next=/reset-password",
    );
  });
});
