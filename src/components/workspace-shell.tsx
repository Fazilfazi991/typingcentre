import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";

export async function WorkspaceShell({ organizationName, children }: { organizationName: string; children: React.ReactNode }) {
  const workspace = await getWorkspaceContext();
  const plan = workspace?.subscription.plan ? `${workspace.subscription.plan[0].toUpperCase()}${workspace.subscription.plan.slice(1)}` : "Plan unavailable";
  return <main className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard">RenewTrack</Link><p className="tenant-name">{organizationName}</p><p className="eyebrow">{plan}</p><nav><Link href="/dashboard">Dashboard</Link><Link href="/companies">Companies</Link><Link href="/customers">Customers</Link><span>Documents</span><span>Renewals</span></nav><form action={logoutAction}><button className="quiet-button">Log out</button></form></aside><section className="app-content">{children}</section></main>;
}
