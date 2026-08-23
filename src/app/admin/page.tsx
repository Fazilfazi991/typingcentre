import Link from "next/link";
import { adminDate, requirePlatformAdmin } from "@/lib/platform/admin";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { admin } = await requirePlatformAdmin();
  const [orgs, organizationCount, activeCount, trialCount, pausedCount, suspendedCount, customers, documents, subscriptions, payments, notifications] = await Promise.all([
    admin.from("organizations").select("id,name,account_state,created_at,organization_subscriptions(plan,status,current_period_ends_at,amount,currency)").order("created_at", { ascending: false }).limit(8),
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("account_state", "active"),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("account_state", "trial"),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("account_state", "paused"),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("account_state", "suspended"),
    admin.from("customers").select("id", { count: "exact", head: true }), admin.from("documents").select("id", { count: "exact", head: true }),
    admin.from("organization_subscriptions").select("status,amount,currency,current_period_ends_at"),
    admin.from("platform_payments").select("id,status,amount,currency,organization_id,organizations(name)").in("status", ["failed", "overdue", "pending"]).order("created_at", { ascending: false }).limit(6),
    admin.from("whatsapp_notifications").select("id,status,created_at,organization_id,organizations(name)").eq("status", "failed").order("created_at", { ascending: false }).limit(6),
  ]);
  const all = orgs.data ?? []; const subscriptionRows = subscriptions.data ?? [];
  const activeSubscriptions = subscriptionRows.filter((s: any) => s.status === "active");
  const mrr = activeSubscriptions.reduce((sum: number, s: any) => sum + Number(s.amount ?? 0), 0);
  const kpis = [["Total Typing Centres", organizationCount.count ?? 0], ["Active Centres", activeCount.count ?? 0], ["Total Customers", customers.count ?? 0], ["Total Documents", documents.count ?? 0], ["Active Subscriptions", activeSubscriptions.length], ["Payments Due", payments.data?.length ?? 0]];
  return <><div className="admin-page-heading"><div><p>Platform overview</p><h1>Platform Dashboard</h1><span>Manage Note It typing centres, subscriptions and platform operations.</span></div><Link className="primary-button" href="/admin/typing-centres/new">+ Add Typing Centre</Link></div><section className="admin-kpis">{kpis.map(([label, value]) => <article key={String(label)}><small>{label}</small><strong>{value}</strong></article>)}</section><section className="admin-grid"><Panel title="Typing Centres" link="/admin/typing-centres">{all.map((o: any) => <Link className="admin-list-row" key={o.id} href={`/admin/typing-centres/${o.id}`}><b>{o.name}</b><span>{o.account_state} · created {adminDate(o.created_at)}</span></Link>)}</Panel><Panel title="Subscription attention" link="/admin/subscriptions">{subscriptionRows.filter((s: any) => s.current_period_ends_at).slice(0, 6).map((s: any, i) => <div className="admin-list-row" key={i}><b>{s.plan}</b><span>{s.status} · {adminDate(s.current_period_ends_at)}</span></div>)}</Panel><Panel title="Payment attention" link="/admin/payments">{(payments.data ?? []).map((p: any) => <div className="admin-list-row" key={p.id}><b>{p.organizations?.name ?? "Typing centre"}</b><span>{p.status} · {p.currency} {p.amount}</span></div>)}</Panel><Panel title="WhatsApp health" link="/admin/whatsapp">{(notifications.data ?? []).map((n: any) => <div className="admin-list-row" key={n.id}><b>{n.organizations?.name ?? "Typing centre"}</b><span>Failed {adminDate(n.created_at)}</span></div>)}</Panel></section></>;
}
function Panel({ title, link, children }: { title: string; link: string; children: React.ReactNode }) { return <article className="admin-panel"><header><h2>{title}</h2><Link href={link}>View all</Link></header><div>{children || <p className="admin-empty">Nothing needs attention.</p>}</div></article>; }
