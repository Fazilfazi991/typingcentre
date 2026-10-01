import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { money } from "@/lib/service-requests/workflow";
import { addServiceRequirementAction, createServiceAction, deleteServiceRequirementAction, toggleServiceAction, updateServiceAction } from "@/features/service-requests/actions";
import "../service-requests/service-requests.css";

export const dynamic = "force-dynamic";
const categories = ["Residency & Visa","Emirates ID","MOHRE / Labour","Medical","Company / Business","Documents","Other"];

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  const context = await getWorkspaceContext("/services");
  if (!context) redirect("/account-inactive" as never);
  const params = await searchParams;
  const [{ data: services, error: servicesError }, { data: requirements }, { data: documentTypes }] = await Promise.all([
    context.supabase.from("service_catalog").select("*").eq("organization_id",context.organization.id).order("category").order("name"),
    context.supabase.from("service_catalog_requirements").select("*").eq("organization_id",context.organization.id).order("sort_order"),
    context.supabase.from("organization_document_types").select("id,name").eq("organization_id",context.organization.id).eq("is_active",true).order("name"),
  ]);
  if (servicesError) throw servicesError;
  return <WorkspaceShell organizationName={context.organization.name} activePath="/services">
    <header className="page-heading"><p className="eyebrow">Typing centre setup</p><h1>Services</h1><p>Set your own service prices and document checklist. Government fees are workspace estimates.</p></header>
    {typeof params.error === "string" && <p className="form-error">{params.error}</p>}
    <section className="service-layout">
      <article className="panel service-card"><h2>Add a service</h2>
        <form action={createServiceAction} className="service-form">
          <label>Code<input name="code" placeholder="VISA-RENEWAL" required maxLength={30}/></label>
          <label>Name<input name="name" placeholder="Residence Visa Renewal" required maxLength={160}/></label>
          <label>Category<select name="category">{categories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label>Government fee (AED)<input name="governmentFee" type="number" min="0" step="0.01" defaultValue="0" required/></label>
          <label>Service charge (AED)<input name="serviceFee" type="number" min="0" step="0.01" defaultValue="0" required/></label>
          <label>Expected days<input name="expectedDays" type="number" min="0" max="3650" defaultValue="3" required/></label>
          <label className="service-wide">Description<textarea name="description" rows={3} maxLength={1000}/></label>
          <button className="primary-button service-wide">Add service</button>
        </form>
      </article>
      <div className="service-list">
        {(services ?? []).length ? services!.map(service => <article className="panel service-card" id={`service-${service.id}`} key={service.id}>
          <div className="service-card-top"><div><small>{service.category} · {service.code}</small><h2>{service.name}</h2><p>{service.description || "No description"}</p></div><span className={`service-status ${service.is_active ? "" : "muted"}`}>{service.is_active ? "Active" : "Inactive"}</span></div>
          <div className="service-price"><span>Government fee <b>{money(service.government_fee)}</b></span><span>Service charge <b>{money(service.service_fee)}</b></span><span>Expected <b>{service.expected_days} days</b></span></div>
          <details className="service-edit"><summary>Edit service and prices</summary><form action={updateServiceAction} className="service-form"><input type="hidden" name="serviceId" value={service.id}/><label>Name<input name="name" defaultValue={service.name} required maxLength={160}/></label><label>Government fee (AED)<input name="governmentFee" type="number" min="0" step="0.01" defaultValue={service.government_fee} required/></label><label>Service charge (AED)<input name="serviceFee" type="number" min="0" step="0.01" defaultValue={service.service_fee} required/></label><label>Expected days<input name="expectedDays" type="number" min="0" max="3650" defaultValue={service.expected_days} required/></label><label className="service-wide">Description<textarea name="description" defaultValue={service.description ?? ""} rows={3} maxLength={1000}/></label><button className="primary-button service-wide">Save service</button></form></details>
          <div className="service-card-top"><h3>Required documents</h3><form action={toggleServiceAction}><input type="hidden" name="serviceId" value={service.id}/><button className="text-link">{service.is_active ? "Deactivate" : "Activate"}</button></form></div>
          <ul className="service-checklist">{(requirements ?? []).filter(item => item.service_id === service.id).map(item => <li key={item.id}><span>{item.name}<small>{item.required ? "Required" : "Optional"}</small></span><form action={deleteServiceRequirementAction}><input type="hidden" name="serviceId" value={service.id}/><input type="hidden" name="requirementId" value={item.id}/><button className="text-link" aria-label={`Remove ${item.name}`}>Remove</button></form></li>)}</ul>
          <form action={addServiceRequirementAction} className="service-requirement-form"><input type="hidden" name="serviceId" value={service.id}/>
            <label>Checklist item<input name="name" placeholder="Passport copy" required maxLength={160}/></label>
            <label>Document type<select name="documentTypeId"><option value="">Any type</option>{(documentTypes ?? []).map(type => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
            <label>Order<input name="sortOrder" type="number" min="0" max="999" defaultValue={(requirements ?? []).filter(item => item.service_id === service.id).length * 10}/></label>
            <label className="service-check"><input name="required" type="checkbox" defaultChecked/> Required</label>
            <button className="secondary-button">Add item</button>
          </form>
        </article>) : <article className="panel service-card"><h2>No services yet</h2><p>Add the first service to start taking requests.</p></article>}
      </div>
    </section>
  </WorkspaceShell>;
}
