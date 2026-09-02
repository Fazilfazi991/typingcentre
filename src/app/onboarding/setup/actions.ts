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

  if (step === 2) {
    const name = value(form, "name"); const location = value(form, "location");
    if (name.length < 2 || location.length < 2) return { error: "Enter the business name and Emirate/location." };
    const email = value(form, "email"); const phone = value(form, "phone");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid business email or leave it blank." };
    if (phone && phone.length < 7) return { error: "Enter a valid business phone or leave it blank." };
    const { error } = await context.supabase.from("organizations").update({ name, location, business_email: email || null, phone: phone || null, address: value(form, "address") || null, onboarding_step: 3 }).eq("id", context.organization.id);
    if (error) return { error: "We could not save the business details." };
  } else return { error: "Invalid setup step." };
  revalidatePath("/onboarding/setup");
  return { step: 3 };
}

export async function finishSetup(form: FormData) {
  const context = await getWorkspaceContext("/onboarding/setup");
  if (!context || context.membership.role !== "owner") redirect("/account-inactive" as never);
  const { error } = await context.supabase.from("organizations").update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 4 }).eq("id", context.organization.id);
  if (error) redirect("/onboarding/setup?error=finish" as never);
  redirect((form.get("next") === "import" ? "/imports/new" : "/dashboard") as never);
}
