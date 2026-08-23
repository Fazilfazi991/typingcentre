import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/sender";

/** The already-approved production template. Keep this as the scheduler default. */
export const EXPIRY_SUMMARY_TEMPLATE_NAME = "document_expiry_summary" as const;
export const EXPIRY_SUMMARY_V3_TEMPLATE_NAME = "document_expiry_summary_v3" as const;
export const EXPIRY_SUMMARY_TEMPLATE_LANGUAGE = "en" as const;
export const EXPIRY_SUMMARY_REVIEW_URL = "https://noteitapp.com/renewals?range=30d" as const;
export const EXPIRY_SUMMARY_TEMPLATE_BODY = `Hello {{1}},
You have {{2}} document renewals requiring attention.

Expiring today: {{3}}
Within 7 days: {{4}}
Within 30 days: {{5}}

Open Note It to review upcoming renewals:
https://noteitapp.com/renewals?range=30d` as const;

export function expirySummaryTemplateConfig(
  defaultName: string = EXPIRY_SUMMARY_TEMPLATE_NAME,
  defaultLanguage: string = EXPIRY_SUMMARY_TEMPLATE_LANGUAGE,
) {
  const name = process.env.WHATSAPP_EXPIRY_TEMPLATE_NAME?.trim() || defaultName;
  const language = process.env.WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE?.trim() || defaultLanguage;
  if (!/^[a-z0-9_]+$/i.test(name) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language))
    throw new Error("WhatsApp expiry template configuration is invalid.");
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
      ].map((text) => ({ type: "text", text })),
    },
  ];
}
