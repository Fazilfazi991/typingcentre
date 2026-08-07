import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";

const nav = [
  ["Dashboard", "/dashboard", "⊞"], ["Customers", "/customers", "♙"], ["Companies", "/companies", "▥"],
  ["Documents", "", "▤"], ["Renewals", "", "↻"], ["Calendar", "", "▦"], ["Follow-ups", "/follow-ups", "☷"],
  ["Reports", "", "▥"], ["Settings", "", "⚙"],
];

export async function WorkspaceShell({ organizationName, activePath, children }: { organizationName: string; activePath?: string; children: React.ReactNode }) {
  const workspace = await getWorkspaceContext();
  const plan = workspace?.subscription.plan ? `${workspace.subscription.plan[0].toUpperCase()}${workspace.subscription.plan.slice(1)}` : "Plan unavailable";
  const initials = organizationName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const name = workspace?.profile.full_name || workspace?.user.email?.split("@")[0] || "User";
  const role = workspace?.membership.role?.replace(/_/g, " ") || "Member";

  return <main className="app-shell">
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-top">
        <Link className="brand" href="/dashboard" aria-label="RenewTrack dashboard"><span className="brand-mark">RT</span><span className="brand-copy"><b>RenewTrack</b><small>Expiry Management</small></span></Link>
        <nav>{nav.map(([label, href, icon]) => href ? <Link href={href} key={label} title={label} className={href === activePath ? "nav-active" : ""} aria-current={href === activePath ? "page" : undefined}><i aria-hidden>{icon}</i><span>{label}</span></Link> : <span key={label} className="nav-disabled" title={`${label} is coming soon`}><i aria-hidden>{icon}</i><span>{label}</span></span>)}</nav>
      </div>
      <div className="organization-card"><span className="org-avatar">{initials || "RT"}</span><span><b>{organizationName}</b><small>{workspace?.organization.location || "Workspace"} · {plan}</small></span><span aria-hidden>›</span></div>
      <form action={logoutAction}><button className="sidebar-logout" type="submit">Log out</button></form>
    </aside>
    <section className="app-stage">
      <header className="topbar">
        <div className="global-search" role="search"><svg className="search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input aria-label="Search customers, companies or documents" placeholder="Search customers, companies or documents" /><kbd>Ctrl K</kbd></div>
        <div className="topbar-actions"><details className="create-menu"><summary className="new-button"><span aria-hidden>＋</span> New</summary><div><Link href="/customers/new">Customer</Link><Link href="/companies/new">Company</Link><Link href="/follow-ups">Follow-up</Link></div></details><button className="icon-button" aria-label="Notifications">♧<em>0</em></button><details className="profile-menu"><summary><span className="profile-avatar">{name.split(/\s+/).map((item) => item[0]).slice(0, 2).join("").toUpperCase()}</span><span className="profile-copy"><b>{role}</b><small>{name}</small></span><span aria-hidden>⌄</span></summary><div><form action={logoutAction}><button type="submit">Log out</button></form></div></details></div>
      </header>
      <section className="app-content">{children}</section>
    </section>
  </main>;
}
