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

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await getWorkspaceContext("/service-requests");
  if (!context) redirect("/account-inactive" as never);
  const params = await searchParams;
  const [{ data: requests, error }, { data: services }, { data: customers }, { data: companies }, { data: members }] = await Promise.all([
    context.supabase.from("service_requests").select("id,request_number,status,priority,created_at,total_amount,payment_status,assigned_to,customer_id,company_id,service_id,customers(full_name),companies(name),services(name)").eq("organization_id",context.organization.id).is("archived_at",null).order("created_at",{ascending:false}).limit(500),
    context.supabase.from("services").select("id,name").eq("organization_id",context.organization.id).order("name"),
    context.supabase.from("customers").select("id,full_name").eq("organization_id",context.organization.id).is("archived_at",null).order("full_name").limit(500),
    context.supabase.from("companies").select("id,name").eq("organization_id",context.organization.id).is("archived_at",null).order("name").limit(500),
    context.supabase.from("organization_memberships").select("user_id,role").eq("organization_id",context.organization.id).eq("status","active"),
  ]);
  if (error) throw error;
  const status = param(params,"status"), service = param(params,"service"), assigned = param(params,"assigned"), owner = param(params,"owner"), date = param(params,"date"), search = param(params,"search").toLowerCase().trim();
  const shown = (requests ?? []).filter(item => {
    const customer = one(item.customers)?.full_name ?? "";
    const company = one(item.companies)?.name ?? "";
    const serviceName = one(item.services)?.name ?? "";
    return (!status || item.status === status) && (!service || item.service_id === service) && (!assigned || item.assigned_to === assigned)
      && (!owner || item.customer_id === owner || item.company_id === owner) && (!date || item.created_at.slice(0,10) === date)
      && (!search || [item.request_number,customer,company,serviceName].some(value => value.toLowerCase().includes(search)));
  });
  return <WorkspaceShell organizationName={context.organization.name} activePath="/service-requests">
    <header className="page-heading split"><div><p className="eyebrow">Typing centre operations</p><h1>Service Requests</h1><p>Track work from intake through collection and payment.</p></div><div className="service-actions"><Link className="secondary-button" href="/services">Service catalog</Link><Link className="primary-button" href="/service-requests/new">New request</Link></div></header>
    <form className="panel service-filters" action="/service-requests">
      <label>Search<input name="search" placeholder="SR number, customer or service" defaultValue={param(params,"search")}/></label>
      <label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{requestStatuses.map(value => <option value={value} key={value}>{statusLabels[value]}</option>)}</select></label>
      <label>Service<select name="service" defaultValue={service}><option value="">All services</option>{(services ?? []).map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</select></label>
      <label>Assigned<select name="assigned" defaultValue={assigned}><option value="">Anyone</option>{(members ?? []).map(value => <option value={value.user_id} key={value.user_id}>{value.user_id === context.user.id ? context.profile.full_name || "Me" : `${value.role} · ${value.user_id.slice(0,8)}`}</option>)}</select></label>
      <label>Customer / company<select name="owner" defaultValue={owner}><option value="">All</option><optgroup label="Customers">{(customers ?? []).map(value => <option value={value.id} key={value.id}>{value.full_name}</option>)}</optgroup><optgroup label="Companies">{(companies ?? []).map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</optgroup></select></label>
      <label>Created<input name="date" type="date" defaultValue={date}/></label><button className="secondary-button">Apply filters</button>
    </form>
    <p className="service-count">{shown.length} request{shown.length === 1 ? "" : "s"}</p>
    <div className="panel service-table-wrap"><table className="service-table"><thead><tr><th>Request</th><th>Customer</th><th>Service</th><th>Assigned</th><th>Created</th><th>Status</th><th>Total</th><th>Payment</th></tr></thead><tbody>
      {shown.map(item => <tr key={item.id}><td><Link href={`/service-requests/${item.id}`}><b>{item.request_number}</b></Link></td><td>{one(item.customers)?.full_name ?? "—"}{one(item.companies)?.name && <small>{one(item.companies)?.name}</small>}</td><td>{one(item.services)?.name ?? "—"}</td><td>{item.assigned_to ? item.assigned_to === context.user.id ? context.profile.full_name || "Me" : item.assigned_to.slice(0,8) : "Unassigned"}</td><td>{new Date(item.created_at).toLocaleDateString("en-AE")}</td><td><span className={`service-status status-${item.status}`}>{statusLabels[item.status as RequestStatus]}</span></td><td>{money(item.total_amount)}</td><td>{item.payment_status.replace("_"," ")}</td></tr>)}
    </tbody></table>{!shown.length && <p className="empty-state">No requests match these filters. <Link href="/service-requests/new">Create a request</Link></p>}</div>
  </WorkspaceShell>;
}
