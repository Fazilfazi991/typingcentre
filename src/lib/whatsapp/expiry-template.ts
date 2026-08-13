import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/sender";

export const EXPIRY_SUMMARY_TEMPLATE_NAME = "document_expiry_summary" as const;
export const EXPIRY_SUMMARY_TEMPLATE_LANGUAGE = "en" as const;

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
