import { z } from "zod";

const optionalText = (max = 180) => z.string().trim().max(max).optional().or(z.literal(""));
const phone = z.string().trim().min(7).max(32);

export const companySchema = z.object({
  name: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(120), licenceNumber: optionalText(80), tradeName: optionalText(), industry: optionalText(), businessActivity: optionalText(), companyType: optionalText(), contactName: optionalText(), contactPhone: optionalText(32), whatsappNumber: optionalText(32), contactEmail: z.string().trim().email().optional().or(z.literal("")), address: optionalText(500), establishmentCardNumber: optionalText(80), immigrationFileNumber: optionalText(80), vatRegistrationNumber: optionalText(80), corporateTaxRegistrationNumber: optionalText(80), notes: optionalText(1000),
});

export const branchSchema = z.object({ name: z.string().trim().min(2).max(120), city: z.string().trim().min(2).max(120), code: optionalText(40), contactName: optionalText(), phone: optionalText(32), whatsappNumber: optionalText(32), email: z.string().trim().email().optional().or(z.literal("")), address: optionalText(500), tradeLicenceNumber: optionalText(80), notes: optionalText(1000) });

export const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(160), customerType: z.enum(["individual", "employee", "dependent", "corporate_contact"]), phone, nationality: optionalText(80), email: z.string().trim().email().optional().or(z.literal("")), whatsappNumber: optionalText(32), passportNumber: optionalText(80), emiratesIdNumber: optionalText(80), companyId: z.string().uuid().optional().or(z.literal("")), branchId: z.string().uuid().optional().or(z.literal("")), dateOfBirth: z.string().date().optional().or(z.literal("")), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional().or(z.literal("")), residentialAddress: optionalText(500), sponsorName: optionalText(), sponsorCompany: optionalText(), visaType: optionalText(), profession: optionalText(), notes: optionalText(1000),
}).superRefine((value, ctx) => { if (value.branchId && !value.companyId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["branchId"], message: "Select a company before selecting a branch." }); });

const followUpDateTime = z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid due date.").transform((value) => new Date(value).toISOString());
const optionalUuid = z.string().uuid().optional().or(z.literal(""));
export const followUpSchema = z.object({ customerId: optionalUuid, companyId: optionalUuid, dueAt: followUpDateTime, note: optionalText(1000) }).superRefine((value, ctx) => { if (!value.customerId && !value.companyId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerId"], message: "Select a customer or company." }); });
export const followUpUpdateSchema = z.object({ followUpId: z.string().uuid(), customerId: optionalUuid, companyId: optionalUuid, dueAt: followUpDateTime, note: optionalText(1000) }).superRefine((value, ctx) => { if (!value.customerId && !value.companyId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerId"], message: "Select a customer or company." }); });
export const completeFollowUpSchema = z.object({ followUpId: z.string().uuid(), customerResponse: optionalText(2000), nextDueAt: z.string().trim().optional().or(z.literal("")), nextNote: optionalText(1000) });
