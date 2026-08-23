import Link from "next/link";
import { adminDate, requirePlatformAdmin } from "@/lib/platform/admin";
import { billingLabel, planLabel } from "@/lib/platform/subscription-pricing";

export const dynamic = "force-dynamic";

export default async function Subscriptions() {
  const { admin } = await requirePlatformAdmin("/admin/subscriptions");
  const { data, error } = await admin.from("organization_subscriptions").select("id,plan,status,amount,currency,billing_cycle,current_period_starts_at,current_period_ends_at,organizations(id,name,account_state)").order("current_period_ends_at");
  if (error) throw error;
  return <><div className="admin-page-heading"><div><p>Commercial</p><h1>Subscriptions</h1><span>Note It subscriptions and their calculated renewal dates.</span></div></div><section className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Typing centre</th><th>Plan</th><th>Billing</th><th>Amount</th><th>Start date</th><th>Renewal / expiry</th><th>Status</th></tr></thead><tbody>{(data ?? []).map((s: any) => <tr key={s.id}><td><Link href={`/admin/typing-centres/${s.organizations?.id}`}>{s.organizations?.name}</Link></td><td>{planLabel(s.plan)}</td><td>{billingLabel(s.billing_cycle)}</td><td>AED {s.amount ?? "—"}</td><td>{adminDate(s.current_period_starts_at)}</td><td>{adminDate(s.current_period_ends_at)}</td><td><span className="admin-badge">{s.status}</span></td></tr>)}</tbody></table></section></>;
}
