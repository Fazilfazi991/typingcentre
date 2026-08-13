import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage, { metadata as privacyMetadata } from "@/app/privacy-policy/page";
import TermsPage, { metadata as termsMetadata } from "@/app/terms/page";
import DataDeletionPage, { metadata as deletionMetadata } from "@/app/data-deletion/page";

describe("public legal pages", () => {
  it.each([
    ["Privacy Policy", PrivacyPolicyPage, privacyMetadata, "/data-deletion"],
    ["Terms of Service", TermsPage, termsMetadata, "/privacy-policy"],
    ["Data Deletion Instructions", DataDeletionPage, deletionMetadata, "/privacy-policy"],
  ] as const)(
    "renders %s without authentication dependencies",
    (title, Page, metadata, crossLink) => {
      const html = renderToStaticMarkup(<Page />);
      expect(html).toContain(`<h1>${title}</h1>`);
      expect(html).toContain("August 14, 2026");
      expect(html).toContain("Fusion Ventures FZ-LLC");
      expect(html).toContain(`href=\"${crossLink}\"`);
      expect(html).toContain('href="/privacy-policy"');
      expect(html).toContain('href="/terms"');
      expect(html).toContain('href="/data-deletion"');
      expect(metadata.title).toBe(title);
    },
  );
});
