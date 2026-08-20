import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SearchableOwnerCombobox } from "@/components/searchable-owner-combobox";
import { completeFollowUpAction, createFollowUpAction } from "@/features/crm/actions";
import { applyFollowUpDateFilter, followUpDateFromQuery, followUpDatePath } from "@/lib/follow-ups/filters";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { FollowUpList } from "./follow-up-list";

export const dynamic = "force-dynamic";

export default async function FollowUps({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawDate = (await searchParams).date;
  const dateFilter = followUpDateFromQuery(typeof rawDate === "string" ? rawDate : undefined);
  if (rawDate && !dateFilter) redirect("/follow-ups" as never);
  const destination = dateFilter ? followUpDatePath(dateFilter) : "/follow-ups";
  const context = await getWorkspaceContext(destination);
  if (!context) redirect("/account-inactive" as never);

  const currentTime = new Date();
  const now = currentTime.toISOString();
  let followUpQuery = context.supabase
    .from("follow_ups")
    .select("id,customer_id,company_id,due_at,status,completed_at,note,customer_response,next_follow_up_id,customers(full_name),companies(name)")
    .eq("organization_id", context.organization.id);
  if (dateFilter) followUpQuery = applyFollowUpDateFilter(followUpQuery, dateFilter, currentTime, context.organization.timezone);

  const { data: followUps } = await followUpQuery.order("due_at").limit(50);

  return <WorkspaceShell organizationName={context.organization.name} activePath="/follow-ups">
    <header className="page-heading"><p className="eyebrow">Tasks</p><h1>{dateFilter ? "Today’s follow-ups" : "Follow-ups"}</h1><p>{dateFilter ? "Scheduled customer and company follow-ups for today." : "Customer and company follow-ups for this workspace."}</p></header>
    {dateFilter && <div className="active-filter"><span>Date: Today</span><Link href="/follow-ups">Clear filter</Link></div>}
    <section className="panel follow-up-create-panel"><h2>Add follow-up</h2><form action={createFollowUpAction} className="record-form follow-up-create-form"><input type="hidden" name="returnTo" value={destination}/><label>Customer<SearchableOwnerCombobox kind="customer" name="customerId" /></label><label>Company<SearchableOwnerCombobox kind="company" name="companyId" /></label><label>Due date *<input name="dueAt" type="datetime-local" required/></label><label>Note<input name="note" placeholder="Follow-up note"/></label><button className="primary-button">Add follow-up</button></form></section>
    <section className="panel follow-up-schedule-panel"><h2>{dateFilter ? "Scheduled today" : "Scheduled follow-ups"}</h2>{followUps?.length ? <FollowUpList followUps={followUps} destination={destination} now={now}/> : <p className="empty-state">{dateFilter ? "No follow-ups scheduled for today." : "No follow-ups yet."}</p>}</section>
  </WorkspaceShell>;
}
