import { z } from "zod";
export const loginSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(128), next: z.string().optional() });
export const resetRequestSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) });
export const resetPasswordSchema = z.object({ password: z.string().min(12).max(128), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const onboardingSchema = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(63), location: z.string().trim().min(2).max(120), email: z.string().trim().email(), phone: z.string().trim().min(7).max(24), whatsapp: z.string().trim().max(24).optional(), address: z.string().trim().max(300).optional(), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), acceptTerms: z.literal(true) });
export function safeNext(value: string | undefined) { return value?.startsWith("/") && !value.startsWith("//") ? value : undefined; }
export function loginPathFor(destination: string) {
  const safeDestination = safeNext(destination);
  return safeDestination ? `/login?next=${encodeURIComponent(safeDestination)}` : "/login";
}
