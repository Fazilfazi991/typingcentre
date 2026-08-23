import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getActivePlatformAdmin() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role,status")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.platform_role === "platform_admin" && profile.status === "active" ? user : null;
}
