import { z } from "zod";
export const loginSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(128), next: z.string().optional() });
export const signupSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(12).max(128), confirmPassword: z.string(), displayName: z.string().trim().min(2).max(120) }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const resetRequestSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) });
export const resetPasswordSchema = z.object({ password: z.string().min(12).max(128), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const onboardingSchema = z.object({ name: z.string().trim().min(2).max(160), location: z.string().trim().min(2).max(120), displayName: z.string().trim().min(2).max(120), phone: z.string().trim().max(24).refine((value) => !value || value.length >= 7, "Enter a valid phone number."), acceptTerms: z.literal(true) });
export function safeNext(value: string | undefined) { return value?.startsWith("/") && !value.startsWith("//") ? value : undefined; }
export function loginPathFor(destination: string) {
  const safeDestination = safeNext(destination);
  return safeDestination ? `/login?next=${encodeURIComponent(safeDestination)}` : "/login";
}
