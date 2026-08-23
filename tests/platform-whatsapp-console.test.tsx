import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SendResultPanel,
  TemplatePreview,
  WhatsAppTestControl,
} from "@/app/platform/whatsapp-test-control";
import { maskQaRecipient, templateReady } from "@/lib/whatsapp/qa-console";
import { inspectRouteHealth } from "@/lib/whatsapp/route-health";
import { readFileSync } from "node:fs";

const inspection = {
  graphApiVersion: "v25.0",
  wabaId: "1300612485320552",
  permissions: { whatsapp_business_management: "granted", whatsapp_business_messaging: "granted" },
  paginationComplete: true,
  returnedTemplateCount: 3,
  templates: [
    { name: "hello_world", status: "APPROVED", language: "en_US", category: "UTILITY", buttons: [] },
    { name: "document_expiry_summary", status: "APPROVED", language: "en", category: "UTILITY", buttons: [] },
    { name: "document_expiry_summary_v2", status: "APPROVED", language: "en", category: "UTILITY", buttons: [
      { label: "Review urgent", url: "https://noteitapp.com/renewals?range=today" },
      { label: "View all renewals", url: "https://noteitapp.com/renewals?range=30d" },
    ] },
    { name: "document_expiry_summary_v3", status: "PENDING", language: "en", category: "UTILITY", buttons: [] },
  ],
};

describe("platform WhatsApp QA console", () => {
  it("renders the diagnostics console, template readiness, and customer-safe v2 preview", () => {
    const html = renderToStaticMarkup(<WhatsAppTestControl initialInspection={inspection} />);
    expect(html).toContain("System Health");
    expect(html).toContain("document_expiry_summary_v2");
    expect(html).toContain("document_expiry_summary_v3");
    expect(html).toContain("Ready to send");
    expect(html).toContain("10 renewals that need your attention");
    expect(html).toContain("Review urgent renewals");
    expect(html).toContain("View all renewals");
    expect(html).toContain("/renewals?range=today");
    expect(html).toContain("/renewals?range=30d");
    expect(html).toContain("Use full international format, including +");
    expect(html).not.toContain("test-token");
    expect(html).not.toContain("service_role");
  });

  it("renders the fixed V1 preview", () => {
    const html = renderToStaticMarkup(<TemplatePreview templateName="document_expiry_summary" routes={[]} />);
    expect(html).toContain("You have 10 document renewals requiring attention.");
    expect(html).toContain("Within 7 days: 5");
    expect(html).toContain("Within 30 days: 3");
  });

  it("keeps route diagnostics out of the V2 template preview", () => {
    const html = renderToStaticMarkup(<TemplatePreview templateName="document_expiry_summary_v2" routes={[
      { path: "/renewals?range=today", state: "not_found", httpStatus: 404, label: "404" },
      { path: "/renewals?range=30d", state: "redirect", httpStatus: 307, label: "Redirect/auth expected" },
    ]} />);
    expect(html).not.toContain("404");
    expect(html).not.toContain("Redirect/auth expected");
    expect(html).toContain("Review urgent renewals");
  });

  it("renders Meta acceptance and sanitized failure result states", () => {
    const accepted = renderToStaticMarkup(<SendResultPanel result={{
      success: true,
      responseStatus: 200,
      messageId: "wamid.test",
      templateName: "document_expiry_summary_v2",
      recipientMasked: "+971******4567",
      timestamp: "2026-08-13T06:30:00.000Z",
    }} />);
    expect(accepted).toContain("Meta accepted");
    expect(accepted).toContain("wamid.test");
    expect(accepted).toContain("+971******4567");

    const failed = renderToStaticMarkup(<SendResultPanel result={{
      success: false,
      failureType: "meta",
      error: { code: 131026, title: "Undeliverable", message: "Message undeliverable.", details: "Check recipient." },
    }} />);
    expect(failed).toContain("Meta rejected");
    expect(failed).toContain("131026");
    expect(failed).toContain("Check recipient.");
  });

  it("renders the local rate-limit result distinctly", () => {
    const html = renderToStaticMarkup(<SendResultPanel result={{
      success: false,
      failureType: "rate_limit",
      error: "QA send limit reached. Maximum 3 test sends per 15 minutes.",
    }} />);
    expect(html).toContain("Local rate limit");
    expect(html).toContain("Maximum 3 test sends per 15 minutes");
  });

  it("masks recipients and requires approved templates with a resolved language", () => {
    expect(maskQaRecipient("+971501234567")).toBe("+971******4567");
    expect(templateReady({ name: "v2", status: "APPROVED", language: "en", buttons: [] })).toBe(true);
    expect(templateReady({ name: "v2", status: "APPROVED", buttons: [] })).toBe(false);
    expect(templateReady({ name: "v2", status: "PENDING", language: "en", buttons: [] })).toBe(false);
  });

  it("classifies a route diagnostic 404 without repairing it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    await expect(inspectRouteHealth("/renewals?range=today", fetchMock)).resolves.toEqual({
      path: "/renewals?range=today",
      state: "not_found",
      httpStatus: 404,
      label: "404",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses a wide desktop workspace and stacks every grid at tablet/mobile widths", () => {
    const css = readFileSync("src/app/admin/admin.css", "utf8");
    const page = readFileSync("src/app/platform/page.tsx", "utf8");
    expect(page).toContain('requirePlatformAdmin("/platform")');
    expect(page).toContain('redirect("/admin")');
    expect(css).toContain("width:min(100%,1500px)");
    expect(css).toContain(".admin-grid,.admin-detail-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(css).toContain(".admin-grid,.admin-detail-grid{grid-template-columns:1fr}");
    expect(css).toContain("@media(max-width:760px)");
  });
});
