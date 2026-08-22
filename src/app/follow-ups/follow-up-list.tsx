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

  return <article className={`follow-up-card ${isCompleted ? "is-completed" : ""} ${expanded ? "is-expanded" : ""}`}>
    <button type="button" className="follow-up-card-toggle" onClick={onEdit} aria-expanded={expanded} aria-controls={`follow-up-details-${item.id}`}>
      <span className="follow-up-card-main">
      <div className="follow-up-card-title"><b>{person}</b>{company?.name && customer?.full_name && <small>{company.name}</small>}</div>
      <span className={`follow-up-status ${status.toLowerCase()}`}>{status}</span>
      <p>{item.note || "No note"}</p>
      {isCompleted && <small className="follow-up-completed">Completed {item.completed_at ? formatDateTime(item.completed_at, timezone) : ""}{item.customer_response ? ` · ${item.customer_response}` : ""}</small>}
      </span>
      <span className="follow-up-card-summary">
      <time>{formatDateTime(item.due_at, timezone)}</time>
        <span className="follow-up-expand-label">{expanded ? "Close" : "View"}</span>
      </span>
    </button>
    {expanded && <div id={`follow-up-details-${item.id}`} className="follow-up-card-details">
      {isCompleted ? <>{item.next_follow_up_id && <Link className="follow-up-next-link" href={`/follow-ups/${item.next_follow_up_id}/edit`}>View next follow-up</Link>}<button className="secondary-button" type="button" onClick={onEdit}>Close</button></> : <form action={completeFollowUpAction} className="follow-up-completion-form"><input type="hidden" name="followUpId" value={item.id}/><input type="hidden" name="returnTo" value={destination}/><label>Customer response<textarea name="customerResponse"/></label><label>Next due date<input name="nextDueAt" type="datetime-local"/></label><label>Next note<input name="nextNote"/></label><div className="follow-up-editor-actions"><Link className="secondary-button follow-up-edit" href={`/follow-ups/${item.id}/edit`}>Update follow-up</Link><button className="primary-button follow-up-complete" type="submit">Complete follow-up</button><button className="secondary-button" type="button" onClick={onEdit}>Cancel / close</button></div></form>}
    </div>}
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
