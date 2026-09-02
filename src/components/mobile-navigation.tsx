"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./mobile-navigation.module.css";

type Destination = { label: string; href: string; icon: "dashboard" | "customers" | "documents" | "calendar" | "companies" | "renewals" | "followups" | "reports" | "settings" | "import" };

function Icon({ name }: { name: Destination["icon"] | "more" | "close" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "dashboard") return <svg viewBox="0 0 24 24" {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if (name === "customers") return <svg viewBox="0 0 24 24" {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 3.5 4.8V20"/></svg>;
  if (name === "documents" || name === "import") return <svg viewBox="0 0 24 24" {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>{name === "import" && <path d="m12 16 3-3m-3 3-3-3m3 3V9"/>}</svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24" {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
  if (name === "companies") return <svg viewBox="0 0 24 24" {...common}><path d="M4 21V6l8-3v18M12 9h8v12M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2"/></svg>;
  if (name === "renewals") return <svg viewBox="0 0 24 24" {...common}><path d="M20 7v5h-5M4 17v-5h5M6.1 8A7 7 0 0 1 18 6l2 6M18 16a7 7 0 0 1-11.9 2L4 12"/></svg>;
  if (name === "followups") return <svg viewBox="0 0 24 24" {...common}><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === "reports") return <svg viewBox="0 0 24 24" {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
  if (name === "settings") return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
  if (name === "close") return <svg viewBox="0 0 24 24" {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  return <svg viewBox="0 0 24 24" {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
}

const primary: Destination[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Customers", href: "/customers", icon: "customers" },
  { label: "Documents", href: "/documents", icon: "documents" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
];

export function MobileNavigation({ canImport, logoutAction, actionLabel = "Log out" }: { canImport: boolean; logoutAction: () => void | Promise<void>; actionLabel?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const more: Destination[] = [
    { label: "Companies", href: "/companies", icon: "companies" },
    { label: "Renewals", href: "/renewals?range=30d", icon: "renewals" },
    { label: "Follow-ups", href: "/follow-ups", icon: "followups" },
    { label: "Reports", href: "/reports", icon: "reports" },
    { label: "Settings", href: "/settings", icon: "settings" },
    ...(canImport ? [{ label: "Import data", href: "/imports/new", icon: "import" as const }] : []),
  ];
  const moreActive = more.some((item) => pathname.startsWith(item.href.split("?")[0]));

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("mobile-menu-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("mobile-menu-open"); };
  }, [open]);

  return <>
    <nav className={styles.nav} data-mobile-navigation aria-label="Mobile workspace navigation">
      {primary.map((item) => { const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span></Link>; })}
      <button type="button" onClick={() => setOpen(true)} className={moreActive || open ? styles.active : ""} aria-haspopup="dialog" aria-expanded={open}><Icon name="more"/><span>More</span></button>
    </nav>
    {open && <div className={styles.layer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
        <header><div><h2 id="mobile-more-title">More</h2><p>Workspace tools and settings</p></div><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close"/></button></header>
        <div className={styles.links}>{more.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}><Icon name={item.icon}/><span>{item.label}</span><b aria-hidden>›</b></Link>)}</div>
        <form action={logoutAction}><button type="submit" className={styles.logout}>{actionLabel}</button></form>
      </section>
    </div>}
  </>;
}
