import { describe, expect, it } from "vitest";
import { buildExpiryEmail, digestDocumentCount } from "@/lib/email/expiry-email";
import {
  buildDigestFromRows,
  groupDocumentsByOrganization,
  resolveTenantOwnerEmails,
} from "@/lib/notifications/expiry-notifications";

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
  it("keeps tenant A and B recipients and document digests completely separate", () => {
    const recipients = resolveTenantOwnerEmails(
      [
        { organization_id: "tenant-a", user_id: "owner-a" },
        { organization_id: "tenant-b", user_id: "owner-b" },
      ],
      [
        { id: "owner-a", email: "owner-a@example.com", status: "active" },
        { id: "owner-b", email: "owner-b@example.com", status: "active" },
      ],
    );
    const documents = groupDocumentsByOrganization([
      {
        ...row("2026-08-07"),
        organization_id: "tenant-a",
        customers: {
          full_name: "A Customer",
          is_active: true,
          status: "active",
          archived_at: null,
        },
      },
      {
        ...row("2026-08-10"),
        organization_id: "tenant-b",
        customers: {
          full_name: "B Customer",
          is_active: true,
          status: "active",
          archived_at: null,
        },
      },
    ]);
    const emailA = buildExpiryEmail({
      organizationName: "Tenant A",
      digest: buildDigestFromRows(documents.get("tenant-a")!, now),
      dashboardUrl: "https://app.example.com/documents",
    });
    const emailB = buildExpiryEmail({
      organizationName: "Tenant B",
      digest: buildDigestFromRows(documents.get("tenant-b")!, now),
      dashboardUrl: "https://app.example.com/documents",
    });
    expect(recipients.get("tenant-a")).toBe("owner-a@example.com");
    expect(recipients.get("tenant-b")).toBe("owner-b@example.com");
    expect(recipients.get("tenant-a")).not.toBe(recipients.get("tenant-b"));
    expect(emailA.html).toContain("A Customer");
    expect(emailA.html).not.toContain("B Customer");
    expect(emailB.html).toContain("B Customer");
    expect(emailB.html).not.toContain("A Customer");
  });
  it("safely skips missing, inactive, and malformed primary owner emails", () => {
    const recipients = resolveTenantOwnerEmails(
      [
        { organization_id: "tenant-a", user_id: "a" },
        { organization_id: "tenant-b", user_id: "b" },
        { organization_id: "tenant-c", user_id: "c" },
      ],
      [
        { id: "a", email: "not-an-email", status: "active" },
        { id: "b", email: null, status: "active" },
        { id: "c", email: "inactive@example.com", status: "suspended" },
      ],
    );
    expect(recipients.size).toBe(0);
  });
});
