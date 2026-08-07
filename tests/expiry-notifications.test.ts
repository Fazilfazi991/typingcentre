import { describe, expect, it } from "vitest";
import { buildExpiryEmail, digestDocumentCount } from "@/lib/email/expiry-email";
import { buildDigestFromRows } from "@/lib/notifications/expiry-notifications";

const now = new Date("2026-08-07T05:00:00Z");
const activeType = { name: "Passport", is_active: true };
const row = (expires_on: string, overrides: Record<string, unknown> = {}) => ({
  expires_on,
  document_number: "N123",
  status: "valid",
  customers: { full_name: "Mohammed Fazil", is_active: true, status: "active", archived_at: null },
  companies: null,
  branches: null,
  organization_document_types: activeType,
  ...overrides,
});

describe("expiry notification digest", () => {
  it("classifies each active document exactly once by Dubai calendar date", () => {
    const digest = buildDigestFromRows(
      [row("2026-08-07"), row("2026-08-10"), row("2026-08-22")],
      now,
    );
    expect(digest.today).toHaveLength(1);
    expect(digest.next7Days).toHaveLength(1);
    expect(digest.next30Days).toHaveLength(1);
    expect(digestDocumentCount(digest)).toBe(3);
  });
  it("excludes documents after 30 days and inactive or archived related records", () => {
    const digest = buildDigestFromRows(
      [
        row("2026-09-07"),
        row("2026-08-08", {
          customers: {
            full_name: "Archived",
            is_active: false,
            status: "removed",
            archived_at: "2026-01-01",
          },
        }),
        row("2026-08-08", { organization_document_types: { name: "Inactive", is_active: false } }),
      ],
      now,
    );
    expect(digestDocumentCount(digest)).toBe(0);
  });
  it("renders customer and company records without leaking one into the other", () => {
    const digest = buildDigestFromRows(
      [
        row("2026-08-07"),
        row("2026-08-12", {
          customers: null,
          companies: {
            name: "ABC Trading LLC",
            is_active: true,
            status: "active",
            archived_at: null,
          },
          organization_document_types: { name: "Trade Licence", is_active: true },
        }),
      ],
      now,
    );
    const email = buildExpiryEmail({
      organizationName: "Al Noor Typing Centre",
      digest,
      dashboardUrl: "https://app.example.com/documents",
    });
    expect(email.html).toContain("Mohammed Fazil");
    expect(email.html).toContain("ABC Trading LLC");
    expect(email.html).toContain("Trade Licence");
  });
  it("does not create a digest for an empty tenant", () =>
    expect(digestDocumentCount(buildDigestFromRows([], now))).toBe(0));
});
