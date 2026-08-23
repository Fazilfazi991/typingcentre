import { z } from "zod";

export const typingCentreProvisionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  ownerName: z.string().trim().min(2).max(160),
  ownerMobile: z.string().trim().min(6).max(30),
  phone: z.string().trim().min(6).max(30),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  location: z.string().trim().min(2).max(120),
  country: z.string().trim().max(80).optional(),
  billing: z.enum(["monthly", "annual"]),
  state: z.enum(["active", "trial", "paused", "suspended"]),
  password: z.string().min(12).max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export function isDuplicateAuthEmail(error: { message?: string; code?: string } | null | undefined) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return ["already registered", "already exists", "email_exists", "duplicate"].some((fragment) => message.includes(fragment));
}
