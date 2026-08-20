"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  detail: string;
  href: string;
  category: "document" | "follow-up";
  status: "expired" | "today" | "upcoming" | "completed";
};

function monthStart(value: string) { return `${value.slice(0, 7)}-01`; }
function moveMonth(value: string, amount: number) {
  const date = new Date(`${monthStart(value)}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-AE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`));
}
function daysInMonth(value: string) {
  const start = new Date(`${value}-01T00:00:00Z`);
  const firstDay = start.getUTCDay();
  const total = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: firstDay + total }, (_, index) => index < firstDay ? null : `${value}-${String(index - firstDay + 1).padStart(2, "0")}`);
}

export function CalendarView({ month, today, events }: { month: string; today: string; events: CalendarEvent[] }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => today.startsWith(month) ? today : `${month}-01`);
  useEffect(() => setSelectedDate(today.startsWith(month) ? today : `${month}-01`), [month, today]);
  const byDate = useMemo(() => events.reduce((all, event) => {
    const entries = all.get(event.date) ?? [];
    entries.push(event);
    all.set(event.date, entries);
    return all;
  }, new Map<string, CalendarEvent[]>()), [events]);
  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const navigate = (nextMonth: string) => router.push(`/calendar?month=${nextMonth}`);
  const goToday = () => router.push(`/calendar?month=${today.slice(0, 7)}`);

  return <div className="calendar-layout">
    <section className="panel calendar-panel" aria-label="Calendar">
      <div className="calendar-toolbar">
        <div><p className="eyebrow">Schedule</p><h1>{monthLabel(month)}</h1></div>
        <div className="calendar-controls"><button type="button" onClick={() => navigate(moveMonth(month, -1))} aria-label="Previous month">‹</button><button type="button" onClick={goToday}>Today</button><button type="button" onClick={() => navigate(moveMonth(month, 1))} aria-label="Next month">›</button></div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{daysInMonth(month).map((date, index) => date ? <div key={date} className={`calendar-day ${date === selectedDate ? "is-selected" : ""} ${date === today ? "is-today" : ""}`}>
        <button type="button" className="calendar-date-button" onClick={() => setSelectedDate(date)} aria-pressed={date === selectedDate} aria-label={`Show events for ${dateLabel(date)}`}><time dateTime={date}>{Number(date.slice(-2))}</time></button>
        <span className="calendar-event-summary">{(byDate.get(date) ?? []).slice(0, 2).map((event) => <Link href={event.href} className={`calendar-dot ${event.category} ${event.status}`} key={event.id}>{event.title}</Link>)}</span>
        {(byDate.get(date)?.length ?? 0) > 2 && <button type="button" className="calendar-more-button" onClick={() => setSelectedDate(date)}>+{byDate.get(date)!.length - 2} more</button>}
      </div> : <span key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />)}</div>
    </section>
    <aside className="panel calendar-agenda" aria-live="polite"><div className="panel-heading"><div><h2>{dateLabel(selectedDate)}</h2><p>{selectedEvents.length ? `${selectedEvents.length} scheduled item${selectedEvents.length === 1 ? "" : "s"}` : "No scheduled items"}</p></div></div>{selectedEvents.length ? <ul>{selectedEvents.map((event) => <li key={event.id}><Link href={event.href} className={`calendar-agenda-event ${event.category} ${event.status}`}><span><b>{event.title}</b><small>{event.detail}</small></span><em>{event.status === "today" ? "Due today" : event.status === "expired" ? "Expired" : event.status === "completed" ? "Completed" : event.category === "follow-up" ? "Follow-up" : "Expiry"}</em></Link></li>)}</ul> : <p className="empty-state">No scheduled expiries or follow-ups.</p>}</aside>
  </div>;
}
