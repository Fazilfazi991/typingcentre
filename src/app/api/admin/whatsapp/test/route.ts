import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config/env.server";
import { getActivePlatformAdmin } from "@/lib/platform/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";
import {
  maskQaRecipient,
  QA_EXPIRY_VALUES,
  QA_TEMPLATE_NAMES,
  safeTemplate,
  templateReady,
  type QaTemplateName,
} from "@/lib/whatsapp/qa-console";
import { sendDocumentExpirySummaryV2 } from "@/lib/whatsapp/expiry-template-v2";
import { normalizeWhatsAppRecipient, sendWhatsAppTemplateMessage } from "@/lib/whatsapp/sender";

export const runtime = "nodejs";

const testRequestSchema = z.object({
  recipient: z.string().trim().min(8).max(32),
  templateName: z.enum(QA_TEMPLATE_NAMES),
});

const expirySummaryParameters = ["Al Noor Typing Centre", "10", "2", "5", "3"].map((text) => ({
  type: "text",
  text,
}));
const attempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function rateLimited(userId: string, now = Date.now()) {
  const active = (attempts.get(userId) ?? []).filter((at) => at > now - RATE_WINDOW_MS);
  if (active.length >= MAX_ATTEMPTS) return true;
  attempts.set(userId, [...active, now]);
  return false;
}

async function recentHistory() {
  const admin = getSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("platform_whatsapp_qa_sends")
    .select(
      "id,template_name,template_language,recipient_masked,meta_message_id,response_status,status,meta_error_code,meta_error_title,meta_error_message,meta_error_details,created_at,accepted_at,sent_at,delivered_at,read_at,failed_at",
    )
    .order("created_at", { ascending: false })
    .limit(12);
  return data ?? [];
}

async function recordSend(input: {
  userId: string;
  templateName: QaTemplateName;
  language: string;
  recipientMasked: string;
  result: Awaited<ReturnType<typeof sendWhatsAppTemplateMessage>>;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const now = new Date().toISOString();
  await admin.from("platform_whatsapp_qa_sends").insert({
    platform_admin_user_id: input.userId,
    template_name: input.templateName,
    template_language: input.language,
    recipient_masked: input.recipientMasked,
    meta_message_id: input.result.success ? input.result.messageId ?? null : null,
    response_status: input.result.responseStatus ?? null,
    status: input.result.success ? "accepted" : "failed",
    accepted_at: input.result.success ? now : null,
    failed_at: input.result.success ? null : now,
    meta_error_code: input.result.success ? null : input.result.error.code ?? null,
    meta_error_title: input.result.success ? null : input.result.error.title ?? null,
    meta_error_message: input.result.success ? null : input.result.error.message,
    meta_error_details: input.result.success ? null : input.result.error.details ?? null,
  });
}

export async function POST(request: NextRequest) {
  const user = await getActivePlatformAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (rateLimited(user.id))
    return NextResponse.json(
      {
        failureType: "rate_limit",
        error: "QA send limit reached. Maximum 3 test sends per 15 minutes.",
      },
      { status: 429 },
    );
  const parsed = testRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { failureType: "validation", error: "Choose a supported template and enter a QA recipient." },
      { status: 400 },
    );
  const recipient = normalizeWhatsAppRecipient(parsed.data.recipient.replace(/\s+/g, ""));
  if (!recipient)
    return NextResponse.json(
      {
        failureType: "validation",
        error: "Recipient must be in E.164 format and start with +.",
      },
      { status: 400 },
    );

  const inspection = await inspectWhatsAppManagement(QA_TEMPLATE_NAMES).catch(() => null);
  const graphTemplate = inspection?.matchingTemplates.find(
    (template) => template.name === parsed.data.templateName && template.status === "APPROVED",
  );
  const template = graphTemplate ? safeTemplate(graphTemplate) : undefined;
  if (!templateReady(template) || !template?.language)
    return NextResponse.json(
      { failureType: "template", error: "The selected template is not ready in Meta Graph." },
      { status: 412 },
    );

  const result =
    parsed.data.templateName === "document_expiry_summary_v2"
      ? await sendDocumentExpirySummaryV2({
          recipient,
          ...QA_EXPIRY_VALUES,
          approvedLanguageCode: template.language,
        })
      : await sendWhatsAppTemplateMessage({
          to: recipient,
          templateName: parsed.data.templateName,
          languageCode: template.language,
          components:
            parsed.data.templateName === "document_expiry_summary"
              ? [{ type: "body", parameters: expirySummaryParameters }]
              : undefined,
        });
  const recipientMasked = maskQaRecipient(recipient);
  await recordSend({
    userId: user.id,
    templateName: parsed.data.templateName,
    language: template.language,
    recipientMasked,
    result,
  });
  return NextResponse.json(
    {
      ...result,
      templateName: parsed.data.templateName,
      languageCode: template.language,
      recipientMasked,
      timestamp: new Date().toISOString(),
      failureType: result.success ? undefined : result.error.type === "meta_api" ? "meta" : "local",
    },
    {
    status: result.success ? 200 : result.error.type === "validation" ? 400 : 502,
    headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function GET() {
  const user = await getActivePlatformAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const env = getServerEnv();
  return NextResponse.json(
    {
      configuration: {
        WHATSAPP_ACCESS_TOKEN: Boolean(env.WHATSAPP_ACCESS_TOKEN),
        WHATSAPP_PHONE_NUMBER_ID: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
        WHATSAPP_BUSINESS_ACCOUNT_ID: Boolean(env.WHATSAPP_BUSINESS_ACCOUNT_ID),
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
      },
      history: await recentHistory(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
