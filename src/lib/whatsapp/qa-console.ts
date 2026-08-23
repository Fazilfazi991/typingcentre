import type { WhatsAppTemplateRecord } from "@/lib/whatsapp/management";

export const QA_TEMPLATE_NAMES = [
  "hello_world",
  "document_expiry_summary",
  "document_expiry_summary_v2",
  "document_expiry_summary_v3",
] as const;

export type QaTemplateName = (typeof QA_TEMPLATE_NAMES)[number];

export const QA_EXPIRY_VALUES = {
  tenantName: "Al Noor Typing Centre",
  total: 10,
  today: 2,
  next7: 5,
  next30: 3,
} as const;

export type SafeTemplate = {
  name: string;
  status?: string;
  language?: string;
  category?: string;
  buttons: Array<{ label: string; url: string }>;
};

export function extractStaticUrlButtons(components: unknown[] | undefined) {
  const buttonsComponent = components?.find(
    (component): component is { type: string; buttons?: unknown[] } =>
      Boolean(
        component &&
          typeof component === "object" &&
          "type" in component &&
          component.type === "BUTTONS",
      ),
  );
  return (buttonsComponent?.buttons ?? []).flatMap((button) => {
    if (!button || typeof button !== "object") return [];
    const value = button as Record<string, unknown>;
    return value.type === "URL" && typeof value.text === "string" && typeof value.url === "string"
      ? [{ label: value.text, url: value.url }]
      : [];
  });
}

export function safeTemplate(template: WhatsAppTemplateRecord): SafeTemplate {
  return {
    name: template.name ?? "unknown",
    status: template.status,
    language: template.language,
    category: template.category,
    buttons: extractStaticUrlButtons(template.components),
  };
}

export function templateReady(template: SafeTemplate | undefined) {
  return Boolean(template && template.status === "APPROVED" && template.language);
}

export function maskQaRecipient(recipient: string) {
  const normalized = recipient.replace(/\s+/g, "");
  if (normalized.length <= 8) return "********";
  return `${normalized.slice(0, 4)}******${normalized.slice(-4)}`;
}
