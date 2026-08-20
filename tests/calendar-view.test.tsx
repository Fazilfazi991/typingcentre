/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => query }));

import { CalendarView, type CalendarEvent } from "@/app/calendar/calendar-view";

afterEach(() => { cleanup(); push.mockClear(); query = new URLSearchParams(); });

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

  it("uses the URL month for previous, next, and today navigation", () => {
    const { rerender } = render(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(push).toHaveBeenNthCalledWith(1, "/calendar?month=2026-07");

    query = new URLSearchParams("month=2026-07");
    rerender(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    expect(screen.getByRole("heading", { name: "July 2026" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show events for Tuesday, 7 July 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(push).toHaveBeenLastCalledWith("/calendar?month=2026-08");

    query = new URLSearchParams("month=2026-08");
    rerender(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(push).toHaveBeenLastCalledWith("/calendar?month=2026-08");
  });

  it("handles year boundaries using the URL month", () => {
    query = new URLSearchParams("month=2026-12");
    const { rerender } = render(<CalendarView month="2026-12" today="2026-08-19" events={[]}/>);
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(push).toHaveBeenLastCalledWith("/calendar?month=2027-01");

    query = new URLSearchParams("month=2027-01");
    rerender(<CalendarView month="2027-01" today="2026-08-19" events={[]}/>);
    expect(screen.getByRole("heading", { name: "January 2027" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(push).toHaveBeenLastCalledWith("/calendar?month=2026-12");
  });

  it("shows the required empty state for a selected day without events", () => {
    render(<CalendarView month="2026-08" today="2026-08-19" events={[]}/>);
    expect(screen.getByText("No scheduled expiries or follow-ups.")).toBeTruthy();
  });
});
