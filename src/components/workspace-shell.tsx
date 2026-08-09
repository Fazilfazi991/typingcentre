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
        <div className="global-search" role="search"><input aria-label="Search customers, companies or documents" placeholder="Search customers, companies or documents" /><kbd>Ctrl K</kbd></div>
        <div className="topbar-actions"><details className="create-menu"><summary className="new-button"><span aria-hidden>+</span> New</summary><div><Link href="/customers/new">Customer</Link><Link href="/companies/new">Company</Link><Link href="/follow-ups">Follow-up</Link></div></details><span className="header-divider" aria-hidden/><button className="icon-button notification-button" aria-label={`Notifications, ${unreadNotifications ?? 0} unread`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{(unreadNotifications ?? 0) > 0 && <em>{unreadNotifications}</em>}</button><span className="header-divider" aria-hidden/><details className="profile-menu"><summary><span className="profile-avatar">{name.split(/\s+/).map((item) => item[0]).slice(0, 2).join("").toUpperCase()}</span><span className="profile-copy"><b>{role}</b><small>{name}</small></span><span className="profile-chevron" aria-hidden>⌄</span></summary><div><form action={logoutAction}><button type="submit">Log out</button></form></div></details></div>
      </header>
      <section className="app-content">{children}</section>
    </section>
  </main>;
}
