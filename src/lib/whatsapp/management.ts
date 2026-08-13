import "server-only";
import { getServerEnv } from "@/lib/config/env.server";

const DEFAULT_GRAPH_API_VERSION = "v25.0";
const MAX_TEMPLATE_PAGES = 50;

export type WhatsAppPermissionStatus = "granted" | "declined" | "expired" | "unknown";

export type WhatsAppTemplateRecord = {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: unknown[];
};

export type WhatsAppManagementInspection = {
  graphApiVersion: string;
  wabaId: string;
  permissions: {
    whatsapp_business_management: WhatsAppPermissionStatus;
    whatsapp_business_messaging: WhatsAppPermissionStatus;
  };
  templatesQueried: boolean;
  pagesFetched: number;
  paginationComplete: boolean;
  returnedTemplateCount: number;
  matchingTemplates: WhatsAppTemplateRecord[];
  error?: { httpStatus?: number; code?: number; message: string };
};

type FetchImplementation = typeof fetch;

function safeMetaMessage(value: unknown) {
  if (typeof value !== "string") return "Meta Graph API request failed.";
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(
      /(access[_ -]?token|authorization|app[_ -]?secret)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);
}

async function graphJson(url: URL, accessToken: string, fetchImplementation: FetchImplementation) {
  const response = await fetchImplementation(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: unknown;
    paging?: { cursors?: { after?: unknown } };
    error?: { code?: unknown; message?: unknown };
  };
  return { response, payload };
}

export async function inspectWhatsAppManagement(
  templateName: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<WhatsAppManagementInspection> {
  const env = getServerEnv();
  const graphApiVersion = env.WHATSAPP_GRAPH_API_VERSION ?? DEFAULT_GRAPH_API_VERSION;
  const wabaId = env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "";
  const result: WhatsAppManagementInspection = {
    graphApiVersion,
    wabaId,
    permissions: {
      whatsapp_business_management: "unknown",
      whatsapp_business_messaging: "unknown",
    },
    templatesQueried: false,
    pagesFetched: 0,
    paginationComplete: false,
    returnedTemplateCount: 0,
    matchingTemplates: [],
  };

  if (!env.WHATSAPP_ACCESS_TOKEN || !wabaId) {
    return { ...result, error: { message: "WhatsApp management configuration is incomplete." } };
  }

  const permissionsUrl = new URL(`https://graph.facebook.com/${graphApiVersion}/me/permissions`);
  const permissionResponse = await graphJson(
    permissionsUrl,
    env.WHATSAPP_ACCESS_TOKEN,
    fetchImplementation,
  );
  if (!permissionResponse.response.ok) {
    return {
      ...result,
      error: {
        httpStatus: permissionResponse.response.status,
        code:
          typeof permissionResponse.payload.error?.code === "number"
            ? permissionResponse.payload.error.code
            : undefined,
        message: safeMetaMessage(permissionResponse.payload.error?.message),
      },
    };
  }

  const permissionRows = Array.isArray(permissionResponse.payload.data)
    ? permissionResponse.payload.data
    : [];
  for (const row of permissionRows) {
    if (!row || typeof row !== "object") continue;
    const permission = "permission" in row ? row.permission : undefined;
    const status = "status" in row ? row.status : undefined;
    if (status !== "granted" && status !== "declined" && status !== "expired") continue;
    if (permission === "whatsapp_business_management")
      result.permissions.whatsapp_business_management = status;
    if (permission === "whatsapp_business_messaging")
      result.permissions.whatsapp_business_messaging = status;
  }

  if (result.permissions.whatsapp_business_management !== "granted") return result;

  let after: string | undefined;
  do {
    const templatesUrl = new URL(
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(wabaId)}/message_templates`,
    );
    templatesUrl.searchParams.set("fields", "id,name,language,status,category,components");
    templatesUrl.searchParams.set("limit", "100");
    if (after) templatesUrl.searchParams.set("after", after);

    const templateResponse = await graphJson(
      templatesUrl,
      env.WHATSAPP_ACCESS_TOKEN,
      fetchImplementation,
    );
    result.templatesQueried = true;
    result.pagesFetched++;
    if (!templateResponse.response.ok) {
      return {
        ...result,
        error: {
          httpStatus: templateResponse.response.status,
          code:
            typeof templateResponse.payload.error?.code === "number"
              ? templateResponse.payload.error.code
              : undefined,
          message: safeMetaMessage(templateResponse.payload.error?.message),
        },
      };
    }

    const rows = Array.isArray(templateResponse.payload.data)
      ? (templateResponse.payload.data as WhatsAppTemplateRecord[])
      : [];
    result.returnedTemplateCount += rows.length;
    result.matchingTemplates.push(...rows.filter((row) => row.name === templateName));
    const nextAfter = templateResponse.payload.paging?.cursors?.after;
    after = typeof nextAfter === "string" && nextAfter ? nextAfter : undefined;
  } while (after && result.pagesFetched < MAX_TEMPLATE_PAGES);

  result.paginationComplete = !after;
  return result;
}
