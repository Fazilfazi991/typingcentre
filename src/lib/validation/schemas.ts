import { z } from "zod";
import { appConfig } from "@/lib/config/app";

const phone = z.string().trim().min(7).max(24).regex(/^[+0-9()\-\s]+$/, "Enter a valid phone number.");
const date = z.string().date();
export const organizationProfileSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), phone, location: z.string().trim().min(2).max(80) });
export const customerSchema = z.object({ name: z.string().trim().min(2).max(120), phone, email: z.string().email().optional().or(z.literal("")) });
export const companySchema = z.object({ name: z.string().trim().min(2).max(160), licenceNumber: z.string().trim().max(80).optional() });
export const branchSchema = z.object({ name: z.string().trim().min(2).max(120), location: z.string().trim().min(2).max(120) });
export const documentMetadataSchema = z.object({ type: z.string().min(1), issueDate: date.optional(), expiryDate: date.optional() }).superRefine((value, ctx) => { if (value.issueDate && value.expiryDate && value.expiryDate <= value.issueDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expiryDate"], message: "Expiry date must be after issue date." }); });
export const followUpSchema = z.object({ customerId: z.string().min(1), dueAt: z.string().datetime(), note: z.string().trim().max(1000).optional() });
export const renewalUpdateSchema = z.object({ status: z.enum(["draft", "in_progress", "completed"]), note: z.string().trim().max(1000).optional() });
export const uploadSchema = z.object({ size: z.number().max(appConfig.maximumUploadBytes), type: z.enum(appConfig.supportedUploadMimeTypes) });
