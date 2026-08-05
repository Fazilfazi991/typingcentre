import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/config/env.server";
import { publicEnv, supabasePublicKey } from "@/lib/config/env.public";

export function getSupabaseAdminClient() {
  const env = getServerEnv();
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !supabasePublicKey || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
