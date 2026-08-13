import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config/env.server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppTemplateMessage, sendWhatsAppTextMessage } from "@/lib/whatsapp/sender";

export const runtime = "nodejs";

const testRequestSchema = z.union([
  z.object({
    kind: z.literal("text"),
    recipient: z.string().trim().min(8).max(32),
    message: z.string().trim().min(1).max(500),
  }),
  z.object({
    kind: z.literal("template"),
    recipient: z.string().trim().min(8).max(32),
    templateName: z.literal("hello_world"),
    languageCode: z.literal("en_US"),
  }),
  z.object({
    kind: z.literal("template"),
    recipient: z.string().trim().min(8).max(32),
    templateName: z.literal("document_expiry_summary"),
    languageCode: z.literal("en"),
  }),
]);

const expirySummaryParameters = ["Al Noor Typing Centre", "10", "2", "5", "3"].map((text) => ({
  type: "text",
  text,
}));
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
  const result =
    parsed.data.kind === "template"
      ? await sendWhatsAppTemplateMessage({
          to: parsed.data.recipient,
          templateName: parsed.data.templateName,
          languageCode: parsed.data.languageCode,
          components:
            parsed.data.templateName === "document_expiry_summary"
              ? [{ type: "body", parameters: expirySummaryParameters }]
              : undefined,
        })
      : await sendWhatsAppTextMessage({
          to: parsed.data.recipient,
          body: parsed.data.message,
        });
  return NextResponse.json(result, {
    status: result.success ? 200 : result.error.type === "validation" ? 400 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const user = await platformAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const env = getServerEnv();
  return NextResponse.json(
    {
      configuration: {
        WHATSAPP_ACCESS_TOKEN: Boolean(env.WHATSAPP_ACCESS_TOKEN),
        WHATSAPP_PHONE_NUMBER_ID: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
        WHATSAPP_BUSINESS_ACCOUNT_ID: Boolean(env.WHATSAPP_BUSINESS_ACCOUNT_ID),
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
