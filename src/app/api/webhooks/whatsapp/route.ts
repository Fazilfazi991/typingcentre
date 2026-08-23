import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config/env.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyMetaWebhookSignature } from "@/lib/whatsapp/webhook-signature";

export const runtime = "nodejs";

const metaStatusErrorSchema = z.object({
  code: z.number().int().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  error_data: z.object({ details: z.string().optional() }).optional(),
});

const metaStatusSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  timestamp: z.string().optional(),
  recipient_id: z.string().optional(),
  conversation: z.object({ id: z.string().optional(), origin: z.object({ type: z.string().optional() }).optional() }).optional(),
  pricing: z.object({ category: z.string().optional(), pricing_model: z.string().optional() }).optional(),
  errors: z.array(z.unknown()).optional(),
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
                  statuses: z.array(metaStatusSchema).optional(),
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

function statusTimestamp(value: string | undefined) {
  if (!value || !/^\d{1,12}$/.test(value)) return undefined;
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function persistDeliveryStatus(status: z.infer<typeof metaStatusSchema>) {
  if (!status.id || !status.status || !["sent", "delivered", "read", "failed"].includes(status.status)) return;
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const firstError = (status.errors ?? []).map((item) => metaStatusErrorSchema.safeParse(item)).find((item) => item.success);
  const error = firstError?.success ? firstError.data : undefined;
  const parameters = {
    p_meta_message_id: status.id,
    p_status: status.status,
    p_event_at: statusTimestamp(status.timestamp) ?? null,
    p_error_code: error?.code ?? null,
    p_error_title: sanitizeMetaText(error?.title) ?? null,
    p_error_message: sanitizeMetaText(error?.message) ?? null,
    p_error_details: sanitizeMetaText(error?.error_data?.details) ?? null,
  };
  const [tenantResult, qaResult] = await Promise.all([
    admin.rpc("record_whatsapp_delivery_status", parameters),
    admin.rpc("record_platform_whatsapp_qa_delivery_status", parameters),
  ]);
  if (tenantResult.error && qaResult.error)
    logWebhookEvent({ event_type: "status_persistence_failed", message_id: status.id, delivery_status: status.status });
}

async function logPayload(payload: WhatsAppWebhookPayload) {
  const seen = new Set<string>();
  const persistence: Promise<void>[] = [];

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
        persistence.push(persistDeliveryStatus(status));

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
  await Promise.allSettled(persistence);
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
  const appSecret = getServerEnv().WHATSAPP_APP_SECRET;
  if (!appSecret) {
    logWebhookEvent({ event_type: "signature_configuration_missing" });
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureResult = verifyMetaWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  );
  if (signatureResult !== "valid") {
    logWebhookEvent({ event_type: "signature_rejected", signature_result: signatureResult });
    return NextResponse.json({ received: false }, { status: 401 });
  }

  try {
    const payload = webhookPayloadSchema.safeParse(JSON.parse(rawBody));
    if (payload.success) await logPayload(payload.data);
    else logWebhookEvent({ event_type: "malformed_payload" });
  } catch {
    logWebhookEvent({ event_type: "malformed_payload" });
  }

  return NextResponse.json({ received: true });
}
