export type OrganizationId = string;
export type SubscriptionPlan = "starter" | "business" | "pro";
export type DocumentType = "visa" | "trade_licence" | "labour_card" | "emirates_id" | "passport" | "insurance" | "other";

export interface Organization { id: OrganizationId; name: string; location: string; primaryColor: string; plan: SubscriptionPlan; }
export interface DemoAccount { email: string; password: string; organizationId: OrganizationId; isPlatformAdmin?: boolean; }
export interface TenantRecord { id: string; organizationId: OrganizationId; }
export interface Customer extends TenantRecord { name: string; phone: string; companyId?: string; }
export interface Company extends TenantRecord { name: string; licenceNumber?: string; }
export interface Branch extends TenantRecord { name: string; }
export interface DocumentRecord extends TenantRecord { ownerId: string; type: DocumentType; issueDate?: string; expiryDate?: string; renewalStatus?: "none" | "in_progress"; }
export interface Renewal extends TenantRecord { documentId: string; status: "draft" | "in_progress" | "completed"; }
export interface FollowUp extends TenantRecord { customerId?: string; companyId?: string; dueAt: string; status: "pending" | "completed" | "overdue"; customerResponse?: string; nextFollowUpId?: string; createdBy?: string; updatedAt?: string; }
export interface Notification extends TenantRecord { text: string; readAt?: string; }
export interface ActivityLog extends TenantRecord { message: string; createdAt: string; }
export interface OrganizationSubscription extends TenantRecord { plan: SubscriptionPlan; status: "active" | "trial" | "suspended"; }

export type ServiceCategory = "Residency & Visa" | "Emirates ID" | "MOHRE / Labour" | "Medical" | "Company / Business" | "Documents" | "Other";
export type ServiceRequestStatus = "new" | "waiting_documents" | "ready_to_submit" | "submitted" | "processing" | "action_required" | "ready_for_collection" | "completed" | "cancelled" | "rejected";
export type RequirementStatus = "missing" | "received" | "verified" | "not_required";
export type ServicePaymentStatus = "unpaid" | "part_paid" | "paid";
export interface ServiceCatalogItem extends TenantRecord { code: string; name: string; category: ServiceCategory; governmentFee: number; serviceFee: number; expectedDays: number; isActive: boolean; }
export interface ServiceRequirement extends TenantRecord { serviceId: string; name: string; documentTypeId?: string; required: boolean; sortOrder: number; }
export interface ServiceRequest extends TenantRecord { requestNumber: string; customerId: string; companyId?: string; serviceId: string; assignedTo?: string; status: ServiceRequestStatus; priority: "normal" | "high" | "urgent"; source: "walk_in" | "phone" | "whatsapp" | "online" | "other"; totalAmount: number; paidAmount: number; paymentStatus: ServicePaymentStatus; }
export interface ServiceRequestRequirement extends TenantRecord { serviceRequestId: string; name: string; status: RequirementStatus; documentId?: string; required: boolean; }
export interface ServicePayment extends TenantRecord { serviceRequestId: string; amount: number; method: "cash" | "card" | "bank_transfer" | "other"; paidAt: string; receivedBy?: string; }
