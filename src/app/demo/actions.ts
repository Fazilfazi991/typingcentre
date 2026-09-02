"use server";

import { redirect } from "next/navigation";
import { getDemoCredentials } from "@/lib/demo/workspace";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function switchToDemoAction() {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  const credentials = getDemoCredentials();
  if (!supabase || !credentials) redirect("/demo/unavailable" as never);
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    process.stderr.write(`${JSON.stringify({ event: "demo_switch_failed", reason: "authentication_failed" })}\n`);
    redirect("/demo/unavailable" as never);
  }
  redirect("/dashboard" as never);
}

export async function exitDemoAction() {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/" as never);
}
