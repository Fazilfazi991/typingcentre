import "server-only";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loginPathFor } from "@/lib/auth/validation";

export type WorkspaceContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
  user: { id: string; email?: string };
  profile: { id: string; full_name: string | null; platform_role: string; status: string };
  membership: { organization_id: string; role: string; status: string; is_primary_owner: boolean };
  organization: { id: string; name: string; location: string; timezone: string; primary_color: string; status: string; is_active: boolean };
  subscription: { plan: string; status: string };
};

export const getWorkspaceContext = cache(async (returnTo?: string): Promise<WorkspaceContext | null> => {
  noStore();
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((returnTo ? loginPathFor(returnTo) : "/login") as never);

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, platform_role, status").eq("id", user.id).maybeSingle(),
    supabase.from("organization_memberships").select("organization_id, role, status, is_primary_owner").eq("user_id", user.id).eq("is_primary_owner", true).maybeSingle(),
  ]);
  if (!profile || profile.status !== "active" || profile.platform_role === "platform_admin") redirect("/account-inactive" as never);

  if (!membership || membership.status !== "active") redirect("/account-inactive" as never);

  const [{ data: organization }, { data: subscription }] = await Promise.all([
    supabase.from("organizations").select("id, name, location, timezone, primary_color, status, is_active").eq("id", membership.organization_id).maybeSingle(),
    supabase.from("organization_subscriptions").select("plan, status").eq("organization_id", membership.organization_id).maybeSingle(),
  ]);
  if (!organization || !subscription) redirect("/account-inactive" as never);

  return { supabase, user: { id: user.id, email: user.email }, profile, membership, organization, subscription };
});
