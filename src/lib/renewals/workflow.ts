import type { RenewalRange } from "@/lib/dates/expiry";
import { renewalRangeFromQuery, renewalRangePath } from "@/lib/dates/expiry";

export type RenewalWorkflowStatus = "Pending" | "Contacted" | "Follow-up" | "Submitted" | "Renewed" | "Closed";

export function renewalDetailPath(documentId: string, range: RenewalRange) {
  return `/renewals/${documentId}?range=${range}` as const;
}

export function renewalRangeOrDefault(value: string | undefined): RenewalRange {
  return renewalRangeFromQuery(value) ?? "30d";
}

export function renewalReturnPath(range: RenewalRange) {
  return renewalRangePath(range);
}

export function workflowStatus(input: {
  renewalStatus?: string | null;
  hasPendingFollowUp?: boolean;
  hasContactActivity?: boolean;
}): RenewalWorkflowStatus {
  if (input.renewalStatus === "completed") return "Renewed";
  if (input.renewalStatus === "cancelled") return "Closed";
  if (input.renewalStatus === "submitted") return "Submitted";
  if (input.hasPendingFollowUp) return "Follow-up";
  if (input.hasContactActivity || input.renewalStatus === "in_progress") return "Contacted";
  return "Pending";
}

export function appendRenewalNote(current: string | null | undefined, next: string) {
  const note = next.trim();
  if (!note) return current?.trim() || null;
  const previous = current?.trim();
  return previous ? `${previous}\n${note}` : note;
}

export function renewalRemainingText(days: number | undefined) {
  if (days === undefined) return "Expiry unavailable";
  if (days < 0) return `Expired ${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}
