import "./admin.css";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { requirePlatformAdmin } from "@/lib/platform/admin";

const navigation = [["Dashboard", "/admin"], ["Typing Centres", "/admin/typing-centres"], ["Subscriptions", "/admin/subscriptions"], ["Payments", "/admin/payments"], ["Users", "/admin/users"], ["Usage", "/admin/usage"], ["WhatsApp", "/admin/whatsapp"], ["Audit log", "/admin/audit"], ["Settings", "/admin/settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin("/admin");
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/admin">Note It <small>Platform</small></Link><nav>{navigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><form action={logoutAction}><button type="submit">Log out</button></form></aside><section className="admin-stage"><header className="admin-header"><span>Note It platform console</span><Link href="/dashboard">Tenant workspace</Link></header><div className="admin-content">{children}</div></section></main>;
}
