import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";

export const runtime = "nodejs";

async function platformAdmin() {
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

export async function GET() {
  const user = await platformAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const inspection = await inspectWhatsAppManagement("document_expiry_summary");
    return NextResponse.json(inspection, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "WhatsApp template inspection failed." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
