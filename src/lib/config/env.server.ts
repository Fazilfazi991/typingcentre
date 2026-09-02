import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().min(12).optional(),
  DEMO_USER_EMAIL: z.string().email().optional(),
  DEMO_USER_PASSWORD: z.string().min(12).optional(),
  DEMO_ORGANIZATION_SLUG: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  DEMO_ORGANIZATION_ID: z.string().uuid().optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_ENDPOINT: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1).optional(),
  WHATSAPP_GRAPH_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_EXPIRY_TEMPLATE_NAME: z.string().regex(/^[a-z0-9_]+$/i).optional(),
  WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE: z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/).optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEMO_EMAIL: process.env.DEMO_EMAIL,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD,
    DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
    DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD,
    DEMO_ORGANIZATION_SLUG: process.env.DEMO_ORGANIZATION_SLUG,
    DEMO_ORGANIZATION_ID: process.env.DEMO_ORGANIZATION_ID,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_EXPIRY_TEMPLATE_NAME: process.env.WHATSAPP_EXPIRY_TEMPLATE_NAME,
    WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE: process.env.WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE,
    SENTRY_DSN: process.env.SENTRY_DSN,
  });
}
