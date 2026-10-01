export const requestStatuses = [
  "new", "waiting_documents", "ready_to_submit", "submitted", "processing",
  "action_required", "ready_for_collection", "completed", "cancelled", "rejected",
] as const;

export type RequestStatus = (typeof requestStatuses)[number];

export const statusLabels: Record<RequestStatus, string> = {
  new: "New", waiting_documents: "Waiting for documents", ready_to_submit: "Ready to submit",
  submitted: "Submitted", processing: "Processing", action_required: "Action required",
  ready_for_collection: "Ready for collection", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected",
};

export const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["waiting_documents", "ready_to_submit", "cancelled"],
  waiting_documents: ["ready_to_submit", "cancelled"],
  ready_to_submit: ["waiting_documents", "submitted", "cancelled"],
  submitted: ["processing", "action_required", "rejected"],
  processing: ["action_required", "ready_for_collection", "rejected"],
  action_required: ["waiting_documents", "ready_to_submit", "submitted", "processing", "rejected"],
  ready_for_collection: ["completed", "action_required"],
  completed: [], cancelled: [], rejected: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function calculateTotal(governmentFee: number, otherCost: number, serviceFee: number, discount: number) {
  return Math.max(0, Math.round((governmentFee + otherCost + serviceFee - discount) * 100) / 100);
}

export function paymentStatus(total: number, paid: number) {
  return paid <= 0 ? "unpaid" : paid < total ? "part_paid" : "paid";
}

export function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(Number(value ?? 0));
}
