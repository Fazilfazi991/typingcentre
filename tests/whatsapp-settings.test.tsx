import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, revalidatePath, update, sendWhatsAppTemplateMessage } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  sendWhatsAppTemplateMessage: vi.fn(),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/whatsapp/sender", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp/sender")>()),
  sendWhatsAppTemplateMessage,
}));
vi.mock("@/components/workspace-shell", () => ({ WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import SettingsPage from "@/app/settings/page";
import { sendTestWhatsAppAction, updateWhatsAppSettingsAction } from "@/features/settings/actions";

function actionContext(role = "owner", result: { data: unknown[] | null; error: unknown } = { data: [{ id: "tenant-a" }], error: null }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  update.mockReturnValue({ eq });
  getWorkspaceContext.mockResolvedValue({
    membership: { role },
    organization: { id: "tenant-a", timezone: "Asia/Dubai" },
    user: { id: "user-a" },
    supabase: { from: vi.fn().mockReturnValue({ update }) },
  });
  return { eq, select };
}

function settingsContext() {
  const organizationQuery: any = {
    select: () => organizationQuery,
    eq: () => organizationQuery,
    single: () => Promise.resolve({ data: {
      whatsapp_notifications_enabled: false,
      whatsapp_recipient_phone: null,
      whatsapp_notification_time: "09:00:00",
      whatsapp_last_sent_at: null,
      whatsapp_last_status: null,
    } }),
  };
  const historyQuery: any = {
    select: () => historyQuery,
    eq: () => historyQuery,
    order: () => historyQuery,
    limit: () => historyQuery,
    maybeSingle: () => Promise.resolve({ data: null }),
  };
  getWorkspaceContext.mockResolvedValue({
    membership: { role: "owner" },
    organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" },
    supabase: { from: (table: string) => table === "organizations" ? organizationQuery : historyQuery },
  });
}

describe("tenant WhatsApp settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders default OFF, E.164 guidance, tenant-local timezone, and safe empty status", async () => {
    settingsContext();
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("Enable WhatsApp expiry summary");
    expect(html).not.toContain("checked");
    expect(html).toContain("+971501234567");
    expect(html).toContain("Asia/Dubai");
    expect(html).toContain("Never");
    expect(html).toContain("No deliveries yet");
  });

  it("persists only the authenticated tenant settings with exact phone and local time", async () => {
    const { eq, select } = actionContext();
    const form = new FormData();
    form.set("enabled", "on");
    form.set("phone", "+971501234567");
    form.set("time", "10:30");
    await expect(updateWhatsAppSettingsAction({}, form)).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      whatsapp_notifications_enabled: true,
      whatsapp_recipient_phone: "+971501234567",
      whatsapp_notification_time: "10:30",
    });
    expect(eq).toHaveBeenCalledWith("id", "tenant-a");
    expect(select).toHaveBeenCalledWith("id, whatsapp_notifications_enabled, whatsapp_recipient_phone, whatsapp_notification_time");
  });

  it.each(["0501234567", "971501234567", "+971 50 123 4567"])("rejects a non-exact E.164 recipient: %s", async (phone) => {
    actionContext();
    const form = new FormData();
    form.set("enabled", "on");
    form.set("phone", phone);
    form.set("time", "09:00");
    await expect(updateWhatsAppSettingsAction({}, form)).resolves.toEqual({ error: "Enter a valid E.164 recipient, for example +971523743418." });
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks non-owner writes before touching tenant data", async () => {
    actionContext("member");
    await expect(updateWhatsAppSettingsAction({}, new FormData())).resolves.toEqual({ error: "Only the workspace owner can manage these settings." });
    expect(update).not.toHaveBeenCalled();
  });

  it("does not report success when RLS filters the update to zero rows", async () => {
    actionContext("owner", { data: [], error: null });
    const form = new FormData();
    form.set("enabled", "on");
    form.set("phone", "+971523743418");
    form.set("time", "10:30");
    await expect(updateWhatsAppSettingsAction({}, form)).resolves.toEqual({
      error: "WhatsApp settings could not be saved. Please try again.",
    });
  });

  it("sends the saved tenant recipient without changing digest history", async () => {
    const single = vi.fn().mockResolvedValue({ data: { name: "Tenant A", whatsapp_recipient_phone: "+971523743418" }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    getWorkspaceContext.mockResolvedValue({
      membership: { role: "owner" },
      organization: { id: "tenant-a", name: "Tenant A", timezone: "Asia/Dubai" },
      user: { id: "user-a" },
      supabase: { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) }) },
    });
    sendWhatsAppTemplateMessage.mockResolvedValue({ success: true, responseStatus: 200, messageId: "wamid.test" });

    await expect(sendTestWhatsAppAction({}, new FormData())).resolves.toEqual({ success: true });
    expect(sendWhatsAppTemplateMessage).toHaveBeenCalledWith(expect.objectContaining({
      to: "+971523743418",
      tenantId: "tenant-a",
      components: [{ type: "body", parameters: expect.arrayContaining([{ type: "text", text: "Tenant A (TEST)" }]) }],
    }));
    expect(update).not.toHaveBeenCalled();
  });
});
