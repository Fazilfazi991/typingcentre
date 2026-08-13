import "server-only";
import { getServerEnv } from "@/lib/config/env.server";

const DEFAULT_GRAPH_API_VERSION = "v25.0";
const REQUEST_TIMEOUT_MS = 10_000;

export type WhatsAppTemplateComponent = {
  type: "body" | "header" | "button";
  parameters?: Array<Record<string, unknown>>;
  sub_type?: string;
  index?: string;
};

export type WhatsAppSendResult =
  | { success: true; messageId?: string; responseStatus: number }
  | {
      success: false;
      responseStatus?: number;
      error: {
        type: "configuration" | "validation" | "timeout" | "network" | "meta_api";
        code?: number;
        message: string;
        requiresTemplate?: boolean;
      };
    };

type SendInput = { to: string; tenantId?: string };
type FetchImplementation = typeof fetch;

function safeLog(event: Record<string, string | number | undefined>) {
  process.stdout.write(`${JSON.stringify({ event: "whatsapp_send", ...event })}\n`);
}

function cleanMetaMessage(value: unknown) {
  if (typeof value !== "string") return "WhatsApp API request failed.";
  return value
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/access[_ -]?token\s*[:=]\s*[^\s,]+/gi, "access_token=[redacted]")
    .slice(0, 500);
}

export function normalizeWhatsAppRecipient(value: string): string | null {
  const trimmed = value.trim();
  const international = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  if (!international.startsWith("+")) return null;
  const digits = international.slice(1).replace(/[\s()\-]/g, "");
  return /^\d{8,15}$/.test(digits) ? `+${digits}` : null;
}

function configuration() {
  const env = getServerEnv();
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return null;
  return {
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION ?? DEFAULT_GRAPH_API_VERSION,
  };
}

async function send(
  input: SendInput,
  message: Record<string, unknown>,
  fetchImplementation: FetchImplementation = fetch,
): Promise<WhatsAppSendResult> {
  const recipient = normalizeWhatsAppRecipient(input.to);
  if (!recipient)
    return {
      success: false,
      error: {
        type: "validation",
        message: "Recipient must be an international E.164 phone number.",
      },
    };

  const config = configuration();
  if (!config)
    return {
      success: false,
      error: { type: "configuration", message: "WhatsApp sender configuration is incomplete." },
    };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(
      `https://graph.facebook.com/${config.graphApiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", to: recipient.slice(1), ...message }),
        signal: controller.signal,
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: unknown }>;
      error?: { code?: unknown; message?: unknown; type?: unknown };
    };
    const messageId =
      typeof payload.messages?.[0]?.id === "string" ? payload.messages[0].id : undefined;
    if (response.ok) {
      safeLog({
        event_type: "accepted",
        phone_number_id: config.phoneNumberId,
        message_id: messageId,
        response_status: response.status,
        tenant_id: input.tenantId,
      });
      return { success: true, messageId, responseStatus: response.status };
    }
    const code = typeof payload.error?.code === "number" ? payload.error.code : undefined;
    const messageText = cleanMetaMessage(payload.error?.message);
    const requiresTemplate = code === 131047 || /template/i.test(messageText);
    safeLog({
      event_type: "rejected",
      phone_number_id: config.phoneNumberId,
      response_status: response.status,
      error_code: code,
      tenant_id: input.tenantId,
    });
    return {
      success: false,
      responseStatus: response.status,
      error: { type: "meta_api", code, message: messageText, requiresTemplate },
    };
  } catch (error) {
    const type = error instanceof Error && error.name === "AbortError" ? "timeout" : "network";
    safeLog({ event_type: type, phone_number_id: config.phoneNumberId, tenant_id: input.tenantId });
    return {
      success: false,
      error: {
        type,
        message:
          type === "timeout"
            ? "WhatsApp API request timed out."
            : "WhatsApp API request could not be completed.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function sendWhatsAppTextMessage(
  input: SendInput & { body: string },
  fetchImplementation?: FetchImplementation,
) {
  const body = input.body.trim();
  if (!body || body.length > 4096)
    return Promise.resolve<WhatsAppSendResult>({
      success: false,
      error: { type: "validation", message: "Message body must be between 1 and 4096 characters." },
    });
  return send(input, { type: "text", text: { preview_url: false, body } }, fetchImplementation);
}

export function sendWhatsAppTemplateMessage(
  input: SendInput & {
    templateName: string;
    languageCode: string;
    components?: WhatsAppTemplateComponent[];
  },
  fetchImplementation?: FetchImplementation,
) {
  if (
    !/^[a-z0-9_]+$/i.test(input.templateName) ||
    !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(input.languageCode)
  )
    return Promise.resolve<WhatsAppSendResult>({
      success: false,
      error: { type: "validation", message: "Template name or language code is invalid." },
    });
  return send(
    input,
    {
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        ...(input.components?.length ? { components: input.components } : {}),
      },
    },
    fetchImplementation,
  );
}
