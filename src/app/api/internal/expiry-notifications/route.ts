import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env.server";
import {
  runDailyExpiryNotifications,
  sendTestExpiryDigest,
} from "@/lib/notifications/expiry-notifications";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = getServerEnv().CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runDailyExpiryNotifications());
  } catch {
    return NextResponse.json(
      { error: "Notification job failed. Check server logs and configuration." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (
      typeof body.organizationId !== "string" ||
      typeof body.recipientEmail !== "string" ||
      !/^\S+@\S+\.\S+$/.test(body.recipientEmail)
    )
      return NextResponse.json(
        { error: "organizationId and a valid recipientEmail are required." },
        { status: 400 },
      );
    return NextResponse.json(
      await sendTestExpiryDigest({
        organizationId: body.organizationId,
        recipientEmail: body.recipientEmail,
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Test email could not be sent. Check server logs and configuration." },
      { status: 500 },
    );
  }
}
