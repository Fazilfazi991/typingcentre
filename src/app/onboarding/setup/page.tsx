import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const context = await getWorkspaceContext("/onboarding/setup");
  if (!context) redirect("/login" as never);
  const { data: organization } = await context.supabase.from("organizations").select("name,location,business_email,phone,address,onboarding_step,onboarding_completed_at").eq("id", context.organization.id).single();
  if (!organization) redirect("/account-inactive" as never);
  if (organization.onboarding_completed_at) redirect("/dashboard" as never);
  return <SetupForm organization={{ name: organization.name, location: organization.location, email: organization.business_email ?? "", phone: organization.phone ?? "", address: organization.address ?? "", step: organization.onboarding_step }} />;
}
