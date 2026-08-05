import type { DemoAccount, Organization } from "@/types/domain";

export const demoOrganizations: Organization[] = [
  { id: "alnoor", name: "Al Noor Typing Centre", location: "Dubai", primaryColor: "#2563eb", plan: "business" },
  { id: "smartdocs", name: "Smart Documents Services", location: "Sharjah", primaryColor: "#059669", plan: "starter" },
  { id: "emirateshub", name: "Emirates Business Hub", location: "Abu Dhabi", primaryColor: "#7c3aed", plan: "pro" },
];
export const demoAccounts: DemoAccount[] = [
  { email: "admin@renewtrack.ae", password: "Admin@123", organizationId: "platform", isPlatformAdmin: true },
  { email: "owner@alnoortyping.ae", password: "Demo@123", organizationId: "alnoor" },
  { email: "admin@smartdocs.ae", password: "Demo@123", organizationId: "smartdocs" },
  { email: "manager@emirateshub.ae", password: "Demo@123", organizationId: "emirateshub" },
];
