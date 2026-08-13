import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardHeader } from "@/components/dashboard-header";

describe("DashboardHeader", () => {
  it("renders the approved desktop order with the search icon after the input", () => {
    const html = renderToStaticMarkup(
      <DashboardHeader name="Amina Kareem" role="owner" organizationName="Al Noor Typing Centre" unreadNotifications={4} />,
    );

    const order = ["global-search", "filter-menu", "create-menu", "notification-menu", "profile-menu"].map((className) => html.indexOf(className));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain('placeholder="Search customers, companies or documents..."');
    expect(html.indexOf('name="search"')).toBeLessThan(html.indexOf('aria-label="Search"'));
    expect(html).toContain("Notifications, 4 unread");
    expect(html).toContain("Al Noor Typing Centre");
  });

  it("keeps the browser-local demo engine free of a duplicate legacy topbar", () => {
    const prototype = readFileSync("public/legacy-prototype/index.html", "utf8");
    expect(prototype).not.toContain('<header class="topbar">');
    expect(prototype).toContain("noteit:demo-state");
    expect(prototype).toContain("noteit:demo-command");
  });

  it("renders every demo summary metric as a full semantic button", () => {
    const prototype = readFileSync("public/legacy-prototype/index.html", "utf8");
    expect(prototype).toContain('<button type="button" class="card stat-card overview-kpi-card');
    expect(prototype).toContain("onclick=\"openSummaryCard('${label}')\"");
    expect(prototype).toContain("function openSummaryCard(label)");
    expect(prototype).toContain("label==='Follow-Ups Today'");
    expect(prototype).toContain("View expired documents");
    expect(prototype).toContain("View next 7 days");
    expect(prototype).toContain("View next 30 days");
    expect(prototype).toContain("View follow-ups");
  });

  it("renders the scoped portfolio redesign with functional demo actions", () => {
    const prototype = readFileSync("public/legacy-prototype/index.html", "utf8");
    expect(prototype).toContain('class="portfolio-dashboard"');
    expect(prototype).toContain("Portfolio Status Overview");
    expect(prototype).toContain("Upcoming Expirations");
    expect(prototype).toContain("openExpirationRange90()");
    expect(prototype).toContain("openAllActivity()");
  });
});
