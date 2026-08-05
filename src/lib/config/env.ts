import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1).optional(), CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1).optional(), CLOUDFLARE_R2_PUBLIC_ENDPOINT: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(), EMAIL_FROM: z.string().email().optional(), CRON_SECRET: z.string().min(1).optional(), SENTRY_DSN: z.string().url().optional(),
});
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(), NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(), NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const publicEnv = publicSchema.parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN });
export function getServerEnv() { if (typeof window !== "undefined") throw new Error("Server environment variables cannot be read in the browser."); return serverSchema.parse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_PUBLIC_ENDPOINT: process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT, RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM, CRON_SECRET: process.env.CRON_SECRET, SENTRY_DSN: process.env.SENTRY_DSN }); }
