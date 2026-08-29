import "server-only";

function getConfiguredDemoValue(name: "DEMO_EMAIL" | "DEMO_PASSWORD" | "DEMO_USER_EMAIL" | "DEMO_USER_PASSWORD" | "DEMO_ORGANIZATION_SLUG") {
  const value = process.env[name]?.trim();
  return value || null;
}

/** A demo identity is deliberately configured only on the server. */
export function getDemoCredentials() {
  const email = getConfiguredDemoValue("DEMO_EMAIL") ?? getConfiguredDemoValue("DEMO_USER_EMAIL");
  const password = getConfiguredDemoValue("DEMO_PASSWORD") ?? getConfiguredDemoValue("DEMO_USER_PASSWORD");
  if (!email || !password) return null;
  return { email, password };
}

export function isDemoOrganizationSlug(slug: string | null | undefined) {
  const configured = getConfiguredDemoValue("DEMO_ORGANIZATION_SLUG") ?? "note-it-demo";
  return slug === configured;
}

export function isDemoWorkspace(input: {
  email?: string | null;
  organizationSlug?: string | null;
}) {
  const configuredEmail = getConfiguredDemoValue("DEMO_EMAIL") ?? getConfiguredDemoValue("DEMO_USER_EMAIL");
  return Boolean(
    configuredEmail &&
      input.email?.toLowerCase() === configuredEmail.toLowerCase() &&
      isDemoOrganizationSlug(input.organizationSlug),
  );
}
