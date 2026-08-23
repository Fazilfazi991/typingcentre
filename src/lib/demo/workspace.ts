import "server-only";
import { getServerEnv } from "@/lib/config/env.server";

/** A demo identity is deliberately configured only on the server. */
export function getDemoCredentials() {
  const env = getServerEnv();
  if (!env.DEMO_USER_EMAIL || !env.DEMO_USER_PASSWORD) return null;
  return { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD };
}

export function isDemoOrganizationSlug(slug: string | null | undefined) {
  const configured = getServerEnv().DEMO_ORGANIZATION_SLUG ?? "al-noor-typing-centre";
  return slug === configured;
}

export function isDemoWorkspace(input: {
  email?: string | null;
  organizationSlug?: string | null;
}) {
  const configuredEmail = getServerEnv().DEMO_USER_EMAIL;
  return Boolean(
    configuredEmail &&
      input.email?.toLowerCase() === configuredEmail.toLowerCase() &&
      isDemoOrganizationSlug(input.organizationSlug),
  );
}
