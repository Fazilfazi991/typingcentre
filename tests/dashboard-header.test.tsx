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
});
