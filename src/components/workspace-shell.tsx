import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { NoteItLogo } from "@/components/note-it-logo";

const nav = [
  ["Dashboard", "/dashboard", "⊞"], ["Customers", "/customers", "♙"], ["Companies", "/companies", "▥"],
  ["Documents", "/documents", "▤"], ["Renewals", "", "↻"], ["Calendar", "", "▦"], ["Follow-ups", "/follow-ups", "☷"],
  ["Reports", "", "▥"], ["Settings", "", "⚙"],
];

export async function WorkspaceShell({ organizationName, activePath, children }: { organizationName: string; activePath?: string; children: React.ReactNode }) {
  const workspace = await getWorkspaceContext();
  const plan = workspace?.subscription.plan ? `${workspace.subscription.plan[0].toUpperCase()}${workspace.subscription.plan.slice(1)}` : "Plan unavailable";
  const initials = organizationName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const name = workspace?.profile.full_name || workspace?.user.email?.split("@")[0] || "User";
  const role = workspace?.membership.role?.replace(/_/g, " ") || "Member";
  const { count: unreadNotifications } = workspace ? await workspace.supabase.from("notifications").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organization.id).is("read_at", null) : { count: 0 };

  return <main className="app-shell">
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-top">
        <Link className="brand" href="/dashboard" aria-label="Note It dashboard"><NoteItLogo className="brand-logo" /></Link>
        <nav>{nav.map(([label, href, icon]) => href ? <Link href={href} key={label} title={label} className={href === activePath ? "nav-active" : ""} aria-current={href === activePath ? "page" : undefined}><i aria-hidden>{icon}</i><span>{label}</span></Link> : <span key={label} className="nav-disabled" title={`${label} is coming soon`}><i aria-hidden>{icon}</i><span>{label}</span></span>)}</nav>
      </div>
      <div className="organization-card"><span className="org-avatar">{initials || "RT"}</span><span><b>{organizationName}</b><small>{workspace?.organization.location || "Workspace"} · {plan}</small></span><span aria-hidden>›</span></div>
      <form action={logoutAction}><button className="sidebar-logout" type="submit">Log out</button></form>
    </aside>
    <section className="app-stage">
      <header className="topbar">
        <Link className="topbar-brand" href="/dashboard" aria-label="Note It dashboard"><NoteItLogo className="topbar-logo" /></Link>
        <form className="global-search" role="search" action="/customers"><input name="search" aria-label="Search customers, companies or documents" placeholder="Search customers, companies or documents..." /><button type="submit" aria-label="Search"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg></button></form>
        <div className="topbar-actions"><details className="filter-menu"><summary className="filters-button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 17h16M8 3v8M16 13v8"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="13" r="2"/></svg><span>Filters</span></summary><div><Link href="/documents?expiry=7-days">Expiring in 7 days</Link><Link href="/documents?expiry=30-days">Expiring in 30 days</Link><Link href="/documents?expiry=expired">Expired documents</Link></div></details><details className="create-menu"><summary className="new-button"><span aria-hidden>+</span> New <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary><div><Link href="/customers/new">Customer</Link><Link href="/companies/new">Company</Link><Link href="/follow-ups">Follow-up</Link></div></details><details className="notification-menu"><summary className="icon-button notification-button" aria-label={`Notifications, ${unreadNotifications ?? 0} unread`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{(unreadNotifications ?? 0) > 0 && <em>{unreadNotifications}</em>}</summary><div><b>Notifications</b><p>{(unreadNotifications ?? 0) > 0 ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}` : "You are all caught up."}</p></div></details><details className="profile-menu"><summary><span className="profile-avatar">{name.split(/\s+/).map((item) => item[0]).slice(0, 2).join("").toUpperCase()}</span><span className="profile-copy"><b>{role}</b><small>{organizationName}</small></span><span className="profile-chevron" aria-hidden>⌄</span></summary><div><form action={logoutAction}><button type="submit">Log out</button></form></div></details></div>
      </header>
      <section className="app-content">{children}</section>
    </section>
  </main>;
}
