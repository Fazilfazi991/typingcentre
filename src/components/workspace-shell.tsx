import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { exitDemoAction } from "@/app/demo/actions";
import { DashboardHeader } from "@/components/dashboard-header";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { NoteItLogo } from "@/components/note-it-logo";
import { isDemoWorkspace } from "@/lib/demo/workspace";
import { MobileNavigation } from "@/components/mobile-navigation";

const nav = [
  ["Dashboard", "/dashboard", "⊞"], ["Customers", "/customers", "♙"], ["Companies", "/companies", "▥"],
  ["Documents", "/documents", "▤"], ["Import Data", "/imports/new", "⇧"], ["Renewals", "/renewals?range=30d", "↻"], ["Calendar", "/calendar", "▦"], ["Follow-ups", "/follow-ups", "☷"],
  ["Reports", "/reports", "▥"], ["Settings", "/settings", "⚙"],
];

export async function WorkspaceShell({ organizationName, activePath, children }: { organizationName: string; activePath?: string; children: React.ReactNode }) {
  const workspace = await getWorkspaceContext();
  const plan = workspace?.subscription.plan ? `${workspace.subscription.plan[0].toUpperCase()}${workspace.subscription.plan.slice(1)}` : "Plan unavailable";
  const initials = organizationName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const name = workspace?.profile.full_name || workspace?.user.email?.split("@")[0] || "User";
  const demoWorkspace = workspace ? isDemoWorkspace({ organizationId: workspace.organization.id, organizationSlug: workspace.organization.slug }) : false;
  const role = workspace?.membership.role?.replace(/_/g, " ") || "Member";
  const { count: unreadNotifications } = workspace ? await workspace.supabase.from("notifications").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organization.id).is("read_at", null) : { count: 0 };

  return <main className="app-shell">
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-top">
        <Link className="brand" href="/dashboard" aria-label="Note It dashboard"><NoteItLogo className="brand-logo" /></Link>
        <nav>{nav.filter(([label]) => label !== "Import Data" || (!demoWorkspace && ["owner", "admin"].includes(workspace?.membership.role ?? ""))).map(([label, href, icon]) => { const active = Boolean(activePath && href.startsWith(activePath)); return href ? <Link href={href} key={label} title={label} className={active ? "nav-active" : ""} aria-current={active ? "page" : undefined}><i aria-hidden>{icon}</i><span>{label}</span></Link> : <span key={label} className="nav-disabled" title={`${label} is coming soon`}><i aria-hidden>{icon}</i><span>{label}</span></span>; })}</nav>
      </div>
      <div className="organization-card"><span className="org-avatar">{initials || "RT"}</span><span><b>{organizationName}</b><small>{demoWorkspace ? "Demo Workspace" : `${workspace?.organization.location || "Workspace"} · ${plan}`}</small></span><span aria-hidden>›</span></div>
      <form action={demoWorkspace ? exitDemoAction : logoutAction}><button className="sidebar-logout" type="submit">{demoWorkspace ? "Exit Demo" : "Log out"}</button></form>
    </aside>
    <section className="app-stage">
      {demoWorkspace && <aside className="demo-mode-banner"><span><b>Demo Mode</b> · Shared sample data resets every 6 hours. Use sample/non-sensitive files only.</span><span><Link href="/signup">Create Your Workspace</Link><form action={exitDemoAction}><button type="submit">Exit Demo</button></form></span></aside>}
      <DashboardHeader name={name} role={role} organizationName={organizationName} unreadNotifications={unreadNotifications ?? 0} logoutAction={demoWorkspace ? exitDemoAction : logoutAction} />
      <section className="app-content">{children}</section>
    </section>
    <MobileNavigation canImport={!demoWorkspace && ["owner", "admin"].includes(workspace?.membership.role ?? "")} logoutAction={demoWorkspace ? exitDemoAction : logoutAction} actionLabel={demoWorkspace ? "Exit Demo" : "Log out"} />
  </main>;
}
