import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config/env.server";

export const runtime = "nodejs";

const metaStatusErrorSchema = z.object({
  code: z.number().int().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  error_data: z.object({ details: z.string().optional() }).optional(),
});

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
                    .array(
                      z.object({
                        id: z.string().optional(),
                        status: z.string().optional(),
                        timestamp: z.string().optional(),
                        recipient_id: z.string().optional(),
                        conversation: z
                          .object({
                            id: z.string().optional(),
                            origin: z.object({ type: z.string().optional() }).optional(),
                          })
                          .optional(),
                        pricing: z
                          .object({
                            category: z.string().optional(),
                            pricing_model: z.string().optional(),
                          })
                          .optional(),
                        errors: z.array(z.unknown()).optional(),
                      }),
                    )
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

function sanitizeMetaText(value: string | undefined) {
  if (!value) return undefined;
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/(access[_ -]?token|authorization|verify[_ -]?token|app[_ -]?secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b\d{8,15}\b/g, "[redacted-number]")
    .slice(0, 500);
}

function logWebhookEvent(event: Record<string, string | number | undefined>) {
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
        const statusTimestamp = status.timestamp;
        const key = `status:${whatsappBusinessAccountId ?? ""}:${messageId ?? ""}:${deliveryStatus ?? ""}:${statusTimestamp ?? ""}`;
        if (!messageId || !deliveryStatus || seen.has(key)) continue;
        seen.add(key);
        const statusContext = {
          event_type: "message_status",
          whatsapp_business_account_id: whatsappBusinessAccountId,
          phone_number_id: phoneNumberId,
          message_id: messageId,
          delivery_status: deliveryStatus,
          status_timestamp: statusTimestamp,
          recipient_id: status.recipient_id,
          conversation_id: status.conversation?.id,
          conversation_origin_type: status.conversation?.origin?.type,
          pricing_category: status.pricing?.category,
          pricing_model: status.pricing?.pricing_model,
        };
        logWebhookEvent(statusContext);

        for (const [errorIndex, rawError] of (status.errors ?? []).entries()) {
          const parsedError = metaStatusErrorSchema.safeParse(rawError);
          if (!parsedError.success) {
            logWebhookEvent({
              ...statusContext,
              event_type: "malformed_status_error",
              error_index: errorIndex,
            });
            continue;
          }
          logWebhookEvent({
            ...statusContext,
            event_type: "message_status_error",
            error_index: errorIndex,
            error_code: parsedError.data.code,
            error_title: sanitizeMetaText(parsedError.data.title),
            error_message: sanitizeMetaText(parsedError.data.message),
            error_details: sanitizeMetaText(parsedError.data.error_data?.details),
          });
        }
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
