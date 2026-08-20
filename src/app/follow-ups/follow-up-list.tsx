"use client";

import React, { useState } from "react";
import Link from "next/link";
import { completeFollowUpAction } from "@/features/crm/actions";

type FollowUpRecord = {
  id: string;
  due_at: string;
  status: string;
  completed_at?: string | null;
  note?: string | null;
  customer_response?: string | null;
  next_follow_up_id?: string | null;
  customers?: { full_name?: string | null } | { full_name?: string | null }[] | null;
  companies?: { name?: string | null } | { name?: string | null }[] | null;
};

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AE", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function FollowUpCard({ item, destination, overdue, expanded, onEdit, timezone }: { item: FollowUpRecord; destination: string; overdue: boolean; expanded: boolean; onEdit: () => void; timezone: string }) {
  const customer = relation(item.customers);
  const company = relation(item.companies);
  const person = customer?.full_name || company?.name || "Follow-up";
  const isCompleted = item.status === "completed";
  const status = isCompleted ? "Completed" : overdue ? "Overdue" : "Upcoming";

  return <article className={`follow-up-card ${isCompleted ? "is-completed" : ""}`}>
    <div className="follow-up-card-main">
      <div className="follow-up-card-title"><b>{person}</b>{company?.name && customer?.full_name && <small>{company.name}</small>}</div>
      <span className={`follow-up-status ${status.toLowerCase()}`}>{status}</span>
      <p>{item.note || "No note"}</p>
      {isCompleted && <small className="follow-up-completed">Completed {item.completed_at ? formatDateTime(item.completed_at, timezone) : ""}{item.customer_response ? ` · ${item.customer_response}` : ""}</small>}
    </div>
    <div className="follow-up-card-actions">
      <time>{formatDateTime(item.due_at, timezone)}</time>
      {!isCompleted && <div className="follow-up-action-row"><button type="button" className="secondary-button follow-up-edit" onClick={onEdit} aria-expanded={expanded}>{expanded ? "Cancel" : "Edit"}</button><form action={completeFollowUpAction}><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="returnTo" value={destination}/><input type="hidden" name="customerResponse" value=""/><input type="hidden" name="nextDueAt" value=""/><input type="hidden" name="nextNote" value=""/><button className="danger-button follow-up-complete" type="submit">Mark completed</button></form></div>}
      {item.next_follow_up_id && <Link className="follow-up-next-link" href={`/follow-ups/${item.next_follow_up_id}/edit`}>View next follow-up</Link>}
    </div>
    {!isCompleted && expanded && <form action={completeFollowUpAction} className="follow-up-completion-form"><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="returnTo" value={destination}/><label>Customer response<textarea name="customerResponse"/></label><label>Next due date<input name="nextDueAt" type="datetime-local"/></label><label>Next note<input name="nextNote"/></label><div className="follow-up-editor-actions"><button className="primary-button" type="submit">Save &amp; mark completed</button><button className="secondary-button" type="button" onClick={onEdit}>Cancel</button></div></form>}
  </article>;
}

export function FollowUpList({ followUps, destination, now, timezone }: { followUps: FollowUpRecord[]; destination: string; now: string; timezone: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const overdue = followUps.filter((item) => item.status !== "completed" && item.due_at < now);
  const upcoming = followUps.filter((item) => item.status !== "completed" && item.due_at >= now);
  const completed = followUps.filter((item) => item.status === "completed");
  const groups = [["Overdue", overdue, true], ["Upcoming", upcoming, false], ["Completed", completed, false]] as const;

  return <div className="follow-up-groups">{groups.map(([title, items, isOverdue]) => items.length ? <section className="follow-up-group" key={title}><h3>{title}</h3><div className="follow-up-card-list">{items.map((item) => <FollowUpCard key={item.id} item={item} destination={destination} overdue={isOverdue} expanded={editingId === item.id} onEdit={() => setEditingId((current) => current === item.id ? null : item.id)} timezone={timezone}/>)}</div></section> : null)}</div>;
}
