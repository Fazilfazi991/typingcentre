import Link from "next/link";
import { redirect } from "next/navigation";
import { completeFollowUpAction, createFollowUpAction } from "@/features/crm/actions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function FollowUps() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/account-inactive" as never);
  const now = new Date().toISOString();
  const [{ data: customers }, { data: companies }, { data: followUps }] = await Promise.all([
    context.supabase.from("customers").select("id,full_name,company_id").eq("organization_id", context.organization.id).is("archived_at", null).order("full_name"),
    context.supabase.from("companies").select("id,name").eq("organization_id", context.organization.id).is("archived_at", null).order("name"),
    context.supabase.from("follow_ups").select("id,customer_id,company_id,due_at,status,completed_at,note,customer_response,next_follow_up_id,customers(full_name),companies(name)").eq("organization_id", context.organization.id).order("due_at").limit(50),
  ]);
  return <WorkspaceShell organizationName={context.organization.name}><header className="page-heading"><p className="eyebrow">Tasks</p><h1>Follow-ups</h1><p>Customer and company follow-ups for this workspace.</p></header><section className="panel"><h2>Add follow-up</h2><form action={createFollowUpAction} className="record-form"><input type="hidden" name="returnTo" value="/follow-ups"/><label>Customer<select name="customerId"><option value="">No customer</option>{customers?.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}</select></label><label>Company<select name="companyId"><option value="">No company</option>{companies?.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label>Due date *<input name="dueAt" type="datetime-local" required/></label><label>Note<input name="note" placeholder="Follow-up note"/></label><button className="primary-button">Add follow-up</button></form></section><section className="panel"><h2>Scheduled follow-ups</h2>{followUps?.length ? <div className="stack">{followUps.map((item: any) => { const overdue = item.status === "pending" && item.due_at < now; const customer = Array.isArray(item.customers) ? item.customers[0] : item.customers; const company = Array.isArray(item.companies) ? item.companies[0] : item.companies; return <article className="row" key={item.id}><span><b>{item.status === "completed" ? "Completed" : overdue ? "Overdue" : "Pending"}</b><small>{customer?.full_name || company?.name || "Follow-up"} - {item.note || "No note"}</small>{item.status === "completed" && <small>Completed {item.completed_at ? new Date(item.completed_at).toLocaleString() : ""}{item.customer_response ? ` - Response: ${item.customer_response}` : ""}</small>}{item.next_follow_up_id && <Link href={`/follow-ups/${item.next_follow_up_id}/edit`}>View next follow-up</Link>}</span><time>{new Date(item.due_at).toLocaleString()}{item.status !== "completed" && <><Link href={`/follow-ups/${item.id}/edit`}>Edit</Link><form action={completeFollowUpAction} className="record-form"><input type="hidden" name="followUpId" value={item.id}/><label>Customer response<textarea name="customerResponse"/></label><label>Next due date<input name="nextDueAt" type="datetime-local"/></label><label>Next note<input name="nextNote"/></label><button className="danger-button">Mark completed</button></form></>}</time></article>})}</div> : <p className="empty-state">No follow-ups yet.</p>}</section></WorkspaceShell>;
}
