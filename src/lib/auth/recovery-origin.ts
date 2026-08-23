import "server-only";

const NOTE_IT_ORIGINS = new Set(["https://noteitapp.com", "https://www.noteitapp.com"]);
const VERCEL_PREVIEW_HOST = /^typingcentre-[a-z0-9-]+-faziils-projects\.vercel\.app$/;

function toTrustedOrigin(value: string | null | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) return undefined;
    const origin = url.origin;

    if (NOTE_IT_ORIGINS.has(origin)) return origin;
    if (url.protocol === "https:" && VERCEL_PREVIEW_HOST.test(url.hostname)) return origin;
    if (url.protocol === "http:" && url.hostname === "localhost" && url.port === "3000") return origin;
  } catch {
    // Invalid and untrusted origin values deliberately fall through.
  }

  return undefined;
}

function forwardedOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return host && protocol ? `${protocol}://${host}` : undefined;
}

/**
 * Returns a callback URL on the current trusted deployment. Browser-provided
 * hosts are accepted only for the canonical Note It domains, the known Vercel
 * preview host shape, or local development on port 3000.
 */
export function recoveryRedirectUrl(requestHeaders: Headers, configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL) {
  const origin =
    toTrustedOrigin(requestHeaders.get("origin")) ??
    toTrustedOrigin(forwardedOrigin(requestHeaders)) ??
    toTrustedOrigin(configuredAppUrl) ??
    "http://localhost:3000";

  return `${origin}/auth/callback?next=/reset-password`;
}
