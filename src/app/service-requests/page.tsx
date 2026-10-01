import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { money, requestStatuses, statusLabels, type RequestStatus } from "@/lib/service-requests/workflow";
import "./service-requests.css";

export const dynamic = "force-dynamic";
type Query = Record<string,string | string[] | undefined>;
const param = (query: Query, key: string) => typeof query[key] === "string" ? String(query[key]) : "";
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value;
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" }) : "Not set";
const paymentLabel = (value: string) => value === "part_paid" ? "Part paid" : value[0].toUpperCase() + value.slice(1).replaceAll("_", " ");

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await getWorkspaceContext("/service-requests");
  if (!context) redirect("/account-inactive" as never);
  const params = await searchParams;
  const [{ data: requests, error }, { data: services }, { data: customers }, { data: companies }, { data: members }] = await Promise.all([
    context.supabase.from("service_requests").select("id,request_number,status,priority,created_at,expected_completion_at,total_amount,paid_amount,payment_status,assigned_to,customer_id,company_id,service_id,customers(full_name),companies(name),service_catalog(name)").eq("organization_id",context.organization.id).is("archived_at",null).order("created_at",{ascending:false}).limit(500),
    context.supabase.from("service_catalog").select("id,name").eq("organization_id",context.organization.id).order("name"),
    context.supabase.from("customers").select("id,full_name").eq("organization_id",context.organization.id).is("archived_at",null).order("full_name").limit(500),
    context.supabase.from("companies").select("id,name").eq("organization_id",context.organization.id).is("archived_at",null).order("name").limit(500),
    context.supabase.from("organization_memberships").select("user_id,role").eq("organization_id",context.organization.id).eq("status","active"),
  ]);
  if (error) throw error;
  const memberIds = (members ?? []).map(member => member.user_id);
  const { data: profiles } = memberIds.length ? await context.supabase.from("profiles").select("id,full_name,email").in("id", memberIds) : { data: [] };
  const names = new Map((profiles ?? []).map(profile => [profile.id, profile.full_name || profile.email || "Staff member"]));
  const staffName = (id: string | null) => id ? names.get(id) ?? (id === context.user.id ? context.profile.full_name || "Me" : "Staff member") : "Unassigned";
  const status = param(params,"status"), service = param(params,"service"), assigned = param(params,"assigned"), owner = param(params,"owner"), created = param(params,"date"), payment = param(params,"payment"), search = param(params,"search").toLowerCase().trim();
  const shown = (requests ?? []).filter(item => {
    const customer = one(item.customers)?.full_name ?? "";
    const company = one(item.companies)?.name ?? "";
    const serviceName = one(item.service_catalog)?.name ?? "";
    return (!status || item.status === status) && (!service || item.service_id === service) && (!assigned || item.assigned_to === assigned)
      && (!owner || item.customer_id === owner || item.company_id === owner) && (!created || item.created_at.slice(0,10) === created) && (!payment || item.payment_status === payment)
      && (!search || [item.request_number,customer,company,serviceName].some(value => value.toLowerCase().includes(search)));
  });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: context.organization.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const quickFilters = [{ label: "Today", query: `date=${today}` }, ...(["waiting_documents", "ready_to_submit", "submitted", "processing", "action_required", "ready_for_collection", "completed"] as RequestStatus[]).map(value => ({ label: statusLabels[value], query: `status=${value}` }))];
  return <WorkspaceShell organizationName={context.organization.name} activePath="/service-requests">
    <header className="page-heading split"><div><p className="eyebrow">Counter operations</p><h1>Service Requests</h1><p>Every application, document and payment in one work queue.</p></div><div className="service-actions"><Link className="secondary-button" href="/services">Service catalogue</Link><Link className="primary-button" href="/service-requests/new">New request</Link></div></header>
    <nav className="service-quick-filters" aria-label="Quick request filters"><Link href="/service-requests" className={!status && !created ? "active" : ""}>All requests</Link>{quickFilters.map(filter => <Link key={filter.query} href={`/service-requests?${filter.query}`} className={filter.query === `status=${status}` || filter.query === `date=${created}` ? "active" : ""}>{filter.label}</Link>)}</nav>
    <form className="panel service-filters" action="/service-requests">
      <label>Search<input name="search" placeholder="SR number, customer or service" defaultValue={param(params,"search")}/></label>
      <label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{requestStatuses.map(value => <option value={value} key={value}>{statusLabels[value]}</option>)}</select></label>
      <label>Service<select name="service" defaultValue={service}><option value="">All services</option>{(services ?? []).map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</select></label>
      <label>Assigned staff<select name="assigned" defaultValue={assigned}><option value="">Anyone</option>{(members ?? []).map(value => <option value={value.user_id} key={value.user_id}>{staffName(value.user_id)}</option>)}</select></label>
      <label>Payment<select name="payment" defaultValue={payment}><option value="">All payments</option><option value="unpaid">Unpaid</option><option value="part_paid">Part paid</option><option value="paid">Paid</option></select></label>
      <label>Customer / company<select name="owner" defaultValue={owner}><option value="">All</option><optgroup label="Customers">{(customers ?? []).map(value => <option value={value.id} key={value.id}>{value.full_name}</option>)}</optgroup><optgroup label="Companies">{(companies ?? []).map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</optgroup></select></label>
      <label>Created<input name="date" type="date" defaultValue={created}/></label><button className="secondary-button">Apply filters</button>
    </form>
    <p className="service-count">{shown.length} request{shown.length === 1 ? "" : "s"}</p>
    <div className="panel service-table-wrap"><table className="service-table"><thead><tr><th>Request #</th><th>Customer / Company</th><th>Service</th><th>Assigned</th><th>Created</th><th>Expected</th><th>Status</th><th>Total</th><th>Balance / Payment</th></tr></thead><tbody>
      {shown.map(item => <tr key={item.id}><td><Link href={`/service-requests/${item.id}`}><b>{item.request_number}</b></Link></td><td>{one(item.customers)?.full_name ?? "—"}{one(item.companies)?.name && <small>{one(item.companies)?.name}</small>}</td><td>{one(item.service_catalog)?.name ?? "—"}</td><td>{staffName(item.assigned_to)}</td><td>{date(item.created_at)}</td><td>{date(item.expected_completion_at)}</td><td><span className={`service-status status-${item.status}`}>{statusLabels[item.status as RequestStatus]}</span></td><td>{money(item.total_amount)}</td><td><b>{money(Number(item.total_amount) - Number(item.paid_amount))}</b><small>{paymentLabel(item.payment_status)}</small></td></tr>)}
    </tbody></table>{!shown.length && <p className="empty-state">No requests match these filters. <Link href="/service-requests/new">Create a request</Link></p>}</div>
    <div className="service-mobile-list">{shown.map(item => <Link className="service-mobile-card" href={`/service-requests/${item.id}`} key={item.id}><span className="service-mobile-top"><b>{item.request_number}</b><span className={`service-status status-${item.status}`}>{statusLabels[item.status as RequestStatus]}</span></span><strong>{one(item.service_catalog)?.name ?? "Service"}</strong><span>{one(item.customers)?.full_name ?? "Customer"}{one(item.companies)?.name ? ` · ${one(item.companies)?.name}` : ""}</span><dl><div><dt>Assigned</dt><dd>{staffName(item.assigned_to)}</dd></div><div><dt>Expected</dt><dd>{date(item.expected_completion_at)}</dd></div><div><dt>Balance</dt><dd>{money(Number(item.total_amount) - Number(item.paid_amount))} · {paymentLabel(item.payment_status)}</dd></div></dl></Link>)}</div>
  </WorkspaceShell>;
}
