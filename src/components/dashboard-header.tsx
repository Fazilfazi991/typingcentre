"use client";

import Link from "next/link";
import React, { type FormEvent, type MouseEvent } from "react";

export type DashboardHeaderIdentity = {
  name: string;
  role: string;
  organizationName: string;
  unreadNotifications: number;
};

export type DemoHeaderCommand =
  | { type: "navigate"; target: string }
  | { type: "filter"; range: "today" | "7d" | "30d" | "expired" }
  | { type: "new"; target: "customer" | "company" | "followup" }
  | { type: "search"; query: string }
  | { type: "logout" };

type DashboardHeaderProps = DashboardHeaderIdentity & {
  demo?: boolean;
  onDemoCommand?: (command: DemoHeaderCommand) => void;
  logoutAction?: () => void | Promise<void>;
};

const initialsFor = (name: string) =>
  name.split(/\s+/).map((item) => item[0]).slice(0, 2).join("").toUpperCase();

export function DashboardHeader({
  name,
  role,
  organizationName,
  unreadNotifications,
  demo = false,
  onDemoCommand,
  logoutAction,
}: DashboardHeaderProps) {
  const command = (value: DemoHeaderCommand) => (event: MouseEvent<HTMLElement>) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    onDemoCommand?.(value);
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("search")?.toString().trim() ?? "";
    onDemoCommand?.({ type: "search", query });
  };

  return (
    <header className="topbar">
      <form className="global-search" role="search" action="/customers" onSubmit={submitSearch}>
        <input name="search" aria-label="Search customers, companies or documents" placeholder="Search customers, companies or documents..." />
        <button type="submit" aria-label="Search">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>
        </button>
      </form>
      <div className="topbar-actions">
        <details className="filter-menu">
          <summary className="filters-button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 17h16M8 3v8M16 13v8"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="13" r="2"/></svg><span>Filters</span></summary>
          <div>
            {demo ? <>
              <button type="button" onClick={command({ type: "filter", range: "today" })}>Expiring today</button>
              <button type="button" onClick={command({ type: "filter", range: "7d" })}>Next 7 days</button>
              <button type="button" onClick={command({ type: "filter", range: "30d" })}>Next 30 days</button>
              <button type="button" onClick={command({ type: "filter", range: "expired" })}>Expired documents</button>
            </> : <>
              <Link href="/renewals?range=today">Expiring today</Link>
              <Link href="/renewals?range=7d">Next 7 days</Link>
              <Link href="/renewals?range=30d">Next 30 days</Link>
              <Link href="/renewals?range=expired">Expired documents</Link>
            </>}
          </div>
        </details>
        <details className="create-menu">
          <summary className="new-button"><span aria-hidden>+</span> New <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary>
          <div>
            {demo ? <>
              <button type="button" onClick={command({ type: "new", target: "customer" })}>Customer</button>
              <button type="button" onClick={command({ type: "new", target: "company" })}>Company</button>
              <button type="button" onClick={command({ type: "new", target: "followup" })}>Follow-up</button>
            </> : <>
              <Link href="/customers/new">Customer</Link>
              <Link href="/companies/new">Company</Link>
              <Link href="/follow-ups">Follow-up</Link>
            </>}
          </div>
        </details>
        <details className="notification-menu">
          <summary className="icon-button notification-button" aria-label={`Notifications, ${unreadNotifications} unread`} onClick={demo ? command({ type: "navigate", target: "notifications" }) : undefined}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
            {unreadNotifications > 0 && <em>{unreadNotifications}</em>}
          </summary>
          {!demo && <div><b>Notifications</b><p>{unreadNotifications > 0 ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}` : "You are all caught up."}</p></div>}
        </details>
        <details className="profile-menu">
          <summary><span className="profile-avatar">{initialsFor(name)}</span><span className="profile-copy"><b>{role}</b><small>{organizationName}</small></span><span className="profile-chevron" aria-hidden>⌄</span></summary>
          <div>
            {demo ? <>
              <button type="button" onClick={command({ type: "navigate", target: "settings" })}>Settings</button>
              <button type="button" onClick={command({ type: "logout" })}>Log out</button>
            </> : logoutAction && <form action={logoutAction}><button type="submit">Log out</button></form>}
          </div>
        </details>
      </div>
    </header>
  );
}
