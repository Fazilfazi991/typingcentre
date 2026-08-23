import { NextRequest, NextResponse } from "next/server";
import { getActivePlatformAdmin } from "@/lib/platform/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await getActivePlatformAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const messageId = request.nextUrl.searchParams.get("messageId")?.trim();
  if (!messageId || messageId.length > 300)
    return NextResponse.json({ error: "A valid message ID is required." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Status storage is unavailable." }, { status: 503 });
  const { data, error } = await admin
    .from("platform_whatsapp_qa_sends")
    .select(
      "id,template_name,template_language,recipient_masked,meta_message_id,response_status,status,meta_error_code,meta_error_title,meta_error_message,meta_error_details,created_at,accepted_at,sent_at,delivered_at,read_at,failed_at",
    )
    .eq("meta_message_id", messageId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Status lookup failed." }, { status: 502 });
  if (!data) return NextResponse.json({ error: "QA message was not found." }, { status: 404 });
  return NextResponse.json({ send: data }, { headers: { "Cache-Control": "no-store" } });
}
