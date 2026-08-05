import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateCompanyAction } from "@/features/crm/actions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function EditCompany({ params }: { params: Promise<{ companyId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const { companyId } = await params;
  const { data: company } = await context.supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (!company) notFound();
  return <WorkspaceShell organizationName={context.organization.name}><header className="page-heading"><Link href={`/companies/${company.id}`}>Back to company</Link><h1>Edit company</h1></header><form action={updateCompanyAction} className="record-form"><input type="hidden" name="companyId" value={company.id}/><fieldset><legend>Basic information</legend><label>Company name<input name="name" defaultValue={company.name} required/></label><label>Emirate<input name="city" defaultValue={company.city} required/></label><label>Trade name<input name="tradeName" defaultValue={company.trade_name ?? ""}/></label><label>Industry<input name="industry" defaultValue={company.industry ?? ""}/></label><label>Business activity<input name="businessActivity" defaultValue={company.business_activity ?? ""}/></label><label>Company type<input name="companyType" defaultValue={company.company_type ?? ""}/></label></fieldset><fieldset><legend>Registration and contact</legend><label>Trade licence number<input name="licenceNumber" defaultValue={company.licence_number ?? ""}/></label><label>Contact person<input name="contactName" defaultValue={company.contact_name ?? ""}/></label><label>Phone<input name="contactPhone" defaultValue={company.contact_phone ?? ""}/></label><label>WhatsApp<input name="whatsappNumber" defaultValue={company.whatsapp_number ?? ""}/></label><label>Email<input name="contactEmail" type="email" defaultValue={company.contact_email ?? ""}/></label><label className="wide">Address<textarea name="address" rows={3} defaultValue={company.address ?? ""}/></label></fieldset><button className="primary-button">Save changes</button></form></WorkspaceShell>;
}
