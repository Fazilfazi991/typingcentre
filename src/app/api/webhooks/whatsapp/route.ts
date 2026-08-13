import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config/env.server";

export const runtime = "nodejs";

const webhookPayloadSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        id: z.string().optional(),
        changes: z
          .array(
            z.object({
              field: z.string().optional(),
              value: z
                .object({
                  metadata: z.object({ phone_number_id: z.string().optional() }).optional(),
                  messages: z.array(z.object({ id: z.string().optional() })).optional(),
                  statuses: z
                    .array(z.object({ id: z.string().optional(), status: z.string().optional() }))
                    .optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

type WhatsAppWebhookPayload = z.infer<typeof webhookPayloadSchema>;

function logWebhookEvent(event: Record<string, string | undefined>) {
  process.stdout.write(`${JSON.stringify({ event: "whatsapp_webhook", ...event })}\n`);
}

function logPayload(payload: WhatsAppWebhookPayload) {
  const seen = new Set<string>();

  for (const entry of payload.entry ?? []) {
    const whatsappBusinessAccountId = entry.id;
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;

      const phoneNumberId = change.value.metadata?.phone_number_id;
      for (const message of change.value.messages ?? []) {
        const messageId = message.id;
        const key = `message:${whatsappBusinessAccountId ?? ""}:${messageId ?? ""}`;
        if (!messageId || seen.has(key)) continue;
        seen.add(key);
        logWebhookEvent({
          event_type: "message",
          whatsapp_business_account_id: whatsappBusinessAccountId,
          phone_number_id: phoneNumberId,
          message_id: messageId,
        });
      }

      for (const status of change.value.statuses ?? []) {
        const messageId = status.id;
        const deliveryStatus = status.status;
        const key = `status:${whatsappBusinessAccountId ?? ""}:${messageId ?? ""}:${deliveryStatus ?? ""}`;
        if (!messageId || !deliveryStatus || seen.has(key)) continue;
        seen.add(key);
        logWebhookEvent({
          event_type: "message_status",
          whatsapp_business_account_id: whatsappBusinessAccountId,
          phone_number_id: phoneNumberId,
          message_id: messageId,
          delivery_status: deliveryStatus,
        });
      }
    }
  }
}

export function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = getServerEnv().WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expectedToken && verifyToken === expectedToken && challenge !== null)
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });

  return new NextResponse(null, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = webhookPayloadSchema.safeParse(await request.json());
    if (payload.success) logPayload(payload.data);
    else logWebhookEvent({ event_type: "malformed_payload" });
  } catch {
    logWebhookEvent({ event_type: "malformed_payload" });
  }

  return NextResponse.json({ received: true });
}
