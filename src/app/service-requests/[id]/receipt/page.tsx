import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { money } from "@/lib/service-requests/workflow";
import { PrintReceiptButton } from "./print-button";
import "./receipt.css";

export const dynamic = "force-dynamic";
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const { id } = await params;
  const { data: request } = await context.supabase.from("service_requests").select("id,request_number,government_fee,service_fee,other_cost,discount,total_amount,paid_amount,customers(full_name),service_catalog(name)").eq("organization_id", context.organization.id).eq("id", id).maybeSingle();
  if (!request) notFound();
  const { data: payments } = await context.supabase.from("service_payments").select("id,amount,method,paid_at,received_by,reference").eq("organization_id", context.organization.id).eq("service_request_id", id).order("paid_at", { ascending: false });
  if (!payments?.length) notFound();
  const staffIds = [...new Set(payments.map(payment => payment.received_by).filter((value): value is string => !!value))];
  const { data: profiles } = staffIds.length ? await context.supabase.from("profiles").select("id,full_name,email").in("id", staffIds) : { data: [] };
  const names = new Map((profiles ?? []).map(profile => [profile.id, profile.full_name || profile.email || "Staff member"]));
  const latest = payments[0];
  const date = (value: string) => new Date(value).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" });
  return <main className="receipt-page"><div className="receipt-toolbar"><Link href={`/service-requests/${id}#payments`}>← Back to request</Link><PrintReceiptButton/></div><article className="receipt-sheet"><header><div><p className="receipt-mark">NOTE IT</p><h1>{context.organization.name}</h1><p>Typing Centre CRM · Payment receipt</p></div><div className="receipt-number"><small>Receipt #</small><b>RCP-{new Date(latest.paid_at).getFullYear()}-{latest.id.slice(0, 8).toUpperCase()}</b><small>{date(latest.paid_at)}</small></div></header><section className="receipt-parties"><div><small>Customer</small><b>{one(request.customers)?.full_name ?? "Customer"}</b></div><div><small>Service</small><b>{one(request.service_catalog)?.name ?? "Service"}</b><span>{request.request_number}</span></div></section><section><h2>Service and payment summary</h2><dl className="receipt-lines"><div><dt>Government fee</dt><dd>{money(request.government_fee)}</dd></div><div><dt>Service charge</dt><dd>{money(request.service_fee)}</dd></div><div><dt>Other cost</dt><dd>{money(request.other_cost)}</dd></div><div><dt>Discount</dt><dd>− {money(request.discount)}</dd></div><div className="receipt-total"><dt>Total</dt><dd>{money(request.total_amount)}</dd></div><div><dt>Paid to date</dt><dd>{money(request.paid_amount)}</dd></div><div><dt>Balance</dt><dd>{money(Number(request.total_amount) - Number(request.paid_amount))}</dd></div></dl></section><section><h2>Payments</h2><table><thead><tr><th>Date</th><th>Method</th><th>Handled by</th><th>Amount</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td>{date(payment.paid_at)}</td><td>{payment.method.replaceAll("_", " ")}</td><td>{payment.received_by ? names.get(payment.received_by) ?? "Staff member" : "Staff member"}</td><td>{money(payment.amount)}</td></tr>)}</tbody></table></section><footer>Thank you. This receipt summarizes recorded payments for {request.request_number}.</footer></article></main>;
}
