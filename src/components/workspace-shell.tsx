import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";

export function WorkspaceShell({ organizationName, children }: { organizationName: string; children: React.ReactNode }) {
  return <main className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard">RenewTrack</Link><p className="tenant-name">{organizationName}</p><nav><Link href="/dashboard">Dashboard</Link><Link href="/companies">Companies</Link><Link href="/customers">Customers</Link><span>Documents</span><span>Renewals</span></nav><form action={logoutAction}><button className="quiet-button">Log out</button></form></aside><section className="app-content">{children}</section></main>;
}
