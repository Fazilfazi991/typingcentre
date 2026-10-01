import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createServiceRequestAction } from "@/features/service-requests/actions";
import { getWorkspaceContext } from "@/lib/workspace/context";
import "../service-requests.css";

export const dynamic = "force-dynamic";

export default async function NewServiceRequestPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  const context = await getWorkspaceContext("/service-requests/new");
  if (!context) redirect("/account-inactive" as never);
  const params = await searchParams;
  const [{ data: customers }, { data: companies }, { data: services }, { data: members }] = await Promise.all([
    context.supabase.from("customers").select("id,full_name,company_id").eq("organization_id",context.organization.id).is("archived_at",null).order("full_name").limit(500),
    context.supabase.from("companies").select("id,name").eq("organization_id",context.organization.id).is("archived_at",null).order("name").limit(500),
    context.supabase.from("service_catalog").select("id,name,category,government_fee,service_fee,expected_days").eq("organization_id",context.organization.id).eq("is_active",true).order("name"),
    context.supabase.from("organization_memberships").select("user_id,role").eq("organization_id",context.organization.id).eq("status","active"),
  ]);
  const selectedCustomer = typeof params.customerId === "string" ? params.customerId : "";
  const selectedCompany = typeof params.companyId === "string" ? params.companyId : "";
  return <WorkspaceShell organizationName={context.organization.name} activePath="/service-requests">
    <header className="page-heading"><Link href="/service-requests">← Service Requests</Link><h1>New service request</h1><p>Start a work order for a customer. The service checklist and fees will be copied into the request.</p></header>
    {typeof params.error === "string" && <p className="form-error">{params.error}</p>}
    <article className="panel service-card service-new-card"><form action={createServiceRequestAction} className="service-form">
      <label>Customer<select name="customerId" required defaultValue={selectedCustomer}><option value="">Select customer</option>{(customers ?? []).map(customer => <option value={customer.id} key={customer.id}>{customer.full_name}</option>)}</select></label>
      <label>Company <small>(optional, must match customer)</small><select name="companyId" defaultValue={selectedCompany}><option value="">None</option>{(companies ?? []).map(company => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
      <label className="service-wide">Service<select name="serviceId" required><option value="">Select service</option>{(services ?? []).map(service => <option value={service.id} key={service.id}>{service.category} · {service.name} · AED {Number(service.government_fee) + Number(service.service_fee)}</option>)}</select></label>
      <label>Assign to<select name="assignedTo" defaultValue={context.user.id}><option value="">Unassigned</option>{(members ?? []).map(member => <option value={member.user_id} key={member.user_id}>{member.user_id === context.user.id ? context.profile.full_name || "Me" : `${member.role} · ${member.user_id.slice(0,8)}`}</option>)}</select></label>
      <label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label>Source<select name="source"><option value="walk_in">Walk in</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="online">Online</option><option value="other">Other</option></select></label>
      <label className="service-wide">Notes<textarea name="notes" rows={4} maxLength={3000} placeholder="What does the customer need?"/></label>
      <div className="service-wide service-actions"><button className="primary-button" disabled={!services?.length || !customers?.length}>Create request</button><Link className="secondary-button" href={!customers?.length ? "/customers/new" : "/services"}>{!customers?.length ? "Add customer" : "Manage services"}</Link></div>
    </form></article>
  </WorkspaceShell>;
}
