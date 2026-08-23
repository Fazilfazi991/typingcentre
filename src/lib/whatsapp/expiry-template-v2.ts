import "server-only";
import {
  sendWhatsAppTemplateMessage,
  type WhatsAppSendResult,
  type WhatsAppTemplateComponent,
} from "@/lib/whatsapp/sender";

export const EXPIRY_SUMMARY_V2_TEMPLATE_NAME = "document_expiry_summary_v2" as const;
export const EXPIRY_SUMMARY_V2_TEMPLATE_CATEGORY = "UTILITY" as const;
export const EXPIRY_SUMMARY_V2_TEMPLATE_BODY = `Document expiry summary

Hello {{1}},

You have *{{2}} renewals requiring attention.*

🔴 Expiring today: *{{3}}*
🟠 Next 7 days: *{{4}}*
🟡 Next 30 days: *{{5}}*

Review the records and follow up before they expire.` as const;

export const EXPIRY_SUMMARY_V2_CTA_BUTTONS = [
  {
    index: "0",
    label: "Review urgent",
    url: "https://noteitapp.com/renewals?range=today",
  },
  {
    index: "1",
    label: "View all renewals",
    url: "https://noteitapp.com/renewals?range=30d",
  },
] as const;

export type DocumentExpirySummaryV2Input = {
  recipient: string;
  tenantName: string;
  total: number;
  today: number;
  next7: number;
  next30: number;
  /** Must be copied from the approved template returned by Graph. */
  approvedLanguageCode: string;
};

type FetchImplementation = typeof fetch;

function validCount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function buildDocumentExpirySummaryV2Components(
  tenantName: string,
  counts: Pick<DocumentExpirySummaryV2Input, "total" | "today" | "next7" | "next30">,
): WhatsAppTemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: tenantName },
        { type: "text", text: String(counts.total) },
        { type: "text", text: String(counts.today) },
        { type: "text", text: String(counts.next7) },
        { type: "text", text: String(counts.next30) },
      ],
    },
  ];
}

/**
 * Prepared for controlled use only after v2 is approved and its exact Graph language is known.
 * The approved template uses static website buttons, so no runtime button parameters are sent.
 */
export function sendDocumentExpirySummaryV2(
  input: DocumentExpirySummaryV2Input,
  fetchImplementation?: FetchImplementation,
): Promise<WhatsAppSendResult> {
  const tenantName = input.tenantName.trim();
  if (
    !tenantName ||
    !validCount(input.total) ||
    !validCount(input.today) ||
    !validCount(input.next7) ||
    !validCount(input.next30) ||
    input.total !== input.today + input.next7 + input.next30
  ) {
    return Promise.resolve({
      success: false,
      error: {
        type: "validation",
        message: "Tenant name and consistent non-negative integer expiry counts are required.",
      },
    });
  }
  return sendWhatsAppTemplateMessage(
    {
      to: input.recipient,
      templateName: EXPIRY_SUMMARY_V2_TEMPLATE_NAME,
      languageCode: input.approvedLanguageCode,
      components: buildDocumentExpirySummaryV2Components(tenantName, input),
    },
    fetchImplementation,
  );
}
