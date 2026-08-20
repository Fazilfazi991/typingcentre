/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CalendarView, type CalendarEvent } from "@/app/calendar/calendar-view";

afterEach(() => { cleanup(); push.mockClear(); });

const events: CalendarEvent[] = [
  { id: "document-a", date: "2026-08-20", title: "Ahmed Hassan — Emirates ID expiry", detail: "active", href: "/documents/doc-a", category: "document", status: "today" },
  { id: "follow-up-a", date: "2026-08-20", title: "Pearl Business Setup — Follow-up", detail: "3:00 PM", href: "/follow-ups/follow-a/edit", category: "follow-up", status: "upcoming" },
];

describe("CalendarView", () => {
  it("shows a tenant event, selects a date, and links to the canonical record", () => {
    render(<CalendarView month="2026-08" today="2026-08-19" events={events}/>);
    fireEvent.click(screen.getByRole("button", { name: "Show events for Thursday, 20 August 2026" }));
    const documentLinks = screen.getAllByRole("link", { name: /Ahmed Hassan — Emirates ID expiry/ });
    const followUpLinks = screen.getAllByRole("link", { name: /Pearl Business Setup — Follow-up/ });
    expect(documentLinks.some((link) => link.getAttribute("href") === "/documents/doc-a")).toBe(true);
    expect(followUpLinks.some((link) => link.getAttribute("href") === "/follow-ups/follow-a/edit")).toBe(true);
  });

  it("navigates months and returns to today", () => {
    render(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(push).toHaveBeenNthCalledWith(1, "/calendar?month=2026-07");
    expect(push).toHaveBeenNthCalledWith(2, "/calendar?month=2026-09");
    expect(push).toHaveBeenNthCalledWith(3, "/calendar?month=2026-08");
  });

  it("shows the required empty state for a selected day without events", () => {
    render(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    expect(screen.getByText("No scheduled expiries or follow-ups.")).toBeTruthy();
  });
});
