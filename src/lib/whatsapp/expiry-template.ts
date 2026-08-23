import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/sender";

export const EXPIRY_SUMMARY_TEMPLATE_NAME = "document_expiry_summary_v2" as const;
export const EXPIRY_SUMMARY_TEMPLATE_LANGUAGE = "en" as const;
export const EXPIRY_SUMMARY_REVIEW_URL = "https://noteitapp.com/renewals?range=30d" as const;

export function expirySummaryTemplateConfig(
  defaultName: string = EXPIRY_SUMMARY_TEMPLATE_NAME,
  defaultLanguage: string = EXPIRY_SUMMARY_TEMPLATE_LANGUAGE,
) {
  const name = process.env.WHATSAPP_EXPIRY_TEMPLATE_NAME?.trim() || defaultName;
  const language = process.env.WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE?.trim() || defaultLanguage;
  if (!/^[a-z0-9_]+$/i.test(name) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language))
    throw new Error("WhatsApp expiry template configuration is invalid.");
  if (name !== EXPIRY_SUMMARY_TEMPLATE_NAME)
    throw new Error(
      "WhatsApp expiry summaries require the approved document_expiry_summary_v2 template.",
    );
  return { name, language, reviewUrl: EXPIRY_SUMMARY_REVIEW_URL };
}

export type TenantExpiryCounts = {
  today: number;
  next7Days: number;
  next30Days: number;
  total: number;
};

export function buildDocumentExpirySummaryComponents(
  organizationName: string,
  counts: TenantExpiryCounts,
): WhatsAppTemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        organizationName,
        String(counts.total),
        String(counts.today),
        String(counts.next7Days),
        String(counts.next30Days),
        EXPIRY_SUMMARY_REVIEW_URL,
      ].map((text) => ({ type: "text", text })),
    },
  ];
}
