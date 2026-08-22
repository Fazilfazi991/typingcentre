"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace/context";

export type SetupState = { error?: string; step?: number };

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveSetupStep(_: SetupState, form: FormData): Promise<SetupState> {
  const context = await getWorkspaceContext("/onboarding/setup");
  if (!context || context.membership.role !== "owner") return { error: "Only the workspace owner can complete setup." };
  const step = Number(form.get("step"));

  if (step === 1) {
    const name = value(form, "name"); const location = value(form, "location");
    if (name.length < 2 || location.length < 2) return { error: "Enter the business name and Emirate/location." };
    const { error } = await context.supabase.from("organizations").update({ name, location, business_email: value(form, "email") || null, phone: value(form, "phone") || null, address: value(form, "address") || null, onboarding_step: 2 }).eq("id", context.organization.id);
    if (error) return { error: "We could not save the business details." };
  } else if (step === 2) {
    const name = value(form, "branchName"); const city = value(form, "branchCity");
    if (name && city) {
      const { error } = await context.supabase.from("branches").upsert({ organization_id: context.organization.id, name, city, address: value(form, "branchAddress") || null, phone: value(form, "branchPhone") || null }, { onConflict: "organization_id,name" });
      if (error) return { error: "We could not save the branch." };
    }
    const { error } = await context.supabase.from("organizations").update({ onboarding_step: 3 }).eq("id", context.organization.id);
    if (error) return { error: "We could not continue setup." };
  } else if (step === 3) {
    const { error } = await context.supabase.from("organizations").update({ timezone: value(form, "timezone") || "Asia/Dubai", locale: value(form, "locale") || "en-AE", currency: value(form, "currency") || "AED", onboarding_step: 4 }).eq("id", context.organization.id);
    if (error) return { error: "We could not save the workspace preferences." };
  } else return { error: "Invalid setup step." };
  revalidatePath("/onboarding/setup");
  return { step: step + 1 };
}

export async function finishSetup() {
  const context = await getWorkspaceContext("/onboarding/setup");
  if (!context || context.membership.role !== "owner") redirect("/account-inactive" as never);
  const { error } = await context.supabase.from("organizations").update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 4 }).eq("id", context.organization.id);
  if (error) redirect("/onboarding/setup?error=finish" as never);
  redirect("/dashboard" as never);
}
