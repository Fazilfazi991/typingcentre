import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/sender";

export const runtime = "nodejs";

const testRequestSchema = z.object({
  recipient: z.string().trim().min(8).max(32),
  message: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .default(
      "Note It WhatsApp integration test. If you received this message, the production WhatsApp Cloud API connection is working.",
    ),
});
const attempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function rateLimited(userId: string, now = Date.now()) {
  const active = (attempts.get(userId) ?? []).filter((at) => at > now - RATE_WINDOW_MS);
  if (active.length >= MAX_ATTEMPTS) return true;
  attempts.set(userId, [...active, now]);
  return false;
}

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

export async function POST(request: NextRequest) {
  const user = await platformAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (rateLimited(user.id))
    return NextResponse.json(
      { error: "Test-message limit reached. Try again later." },
      { status: 429 },
    );
  const parsed = testRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "A valid recipient and short test message are required." },
      { status: 400 },
    );
  const result = await sendWhatsAppTextMessage({
    to: parsed.data.recipient,
    body: parsed.data.message,
  });
  return NextResponse.json(result, {
    status: result.success ? 200 : result.error.type === "validation" ? 400 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
