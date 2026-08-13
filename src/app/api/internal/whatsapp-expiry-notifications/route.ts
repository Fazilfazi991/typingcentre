import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env.server";
import { runWhatsAppExpiryNotifications } from "@/lib/notifications/whatsapp-expiry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runWhatsAppExpiryNotifications());
  } catch {
    return NextResponse.json({ error: "WhatsApp notification job failed. Check sanitized server logs." }, { status: 500 });
  }
}
