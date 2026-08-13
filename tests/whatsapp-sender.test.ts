import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeWhatsAppRecipient,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp/sender";

const originalEnvironment = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION,
};

function configureSender() {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v25.0";
}

function restoreEnvironment(name: keyof typeof originalEnvironment) {
  const value = originalEnvironment[name];
  if (value === undefined)
    delete process.env[
      name === "accessToken"
        ? "WHATSAPP_ACCESS_TOKEN"
        : name === "phoneNumberId"
          ? "WHATSAPP_PHONE_NUMBER_ID"
          : "WHATSAPP_GRAPH_API_VERSION"
    ];
  else
    process.env[
      name === "accessToken"
        ? "WHATSAPP_ACCESS_TOKEN"
        : name === "phoneNumberId"
          ? "WHATSAPP_PHONE_NUMBER_ID"
          : "WHATSAPP_GRAPH_API_VERSION"
    ] = value;
}

describe("WhatsApp sender", () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
  });

  afterEach(() => {
    restoreEnvironment("accessToken");
    restoreEnvironment("phoneNumberId");
    restoreEnvironment("graphApiVersion");
  });

  it("rejects incomplete sender configuration", async () => {
    const result = await sendWhatsAppTextMessage({ to: "+971501234567", body: "Test" });
    expect(result).toMatchObject({ success: false, error: { type: "configuration" } });
  });

  it("normalizes international numbers and rejects non-international recipients", async () => {
    expect(normalizeWhatsAppRecipient("00 971 (50) 123-4567")).toBe("+971501234567");
    await expect(
      sendWhatsAppTextMessage({ to: "0501234567", body: "Test" }),
    ).resolves.toMatchObject({
      success: false,
      error: { type: "validation" },
    });
  });

  it("sends a text message using the Meta Cloud API payload", async () => {
    configureSender();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: "wamid.abc" }] }), { status: 200 }),
      );
    const result = await sendWhatsAppTextMessage(
      { to: "+971 50 123 4567", body: "Hello" },
      fetchMock,
    );
    expect(result).toEqual({ success: true, messageId: "wamid.abc", responseStatus: 200 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://graph.facebook.com/v25.0/123456789/messages");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      messaging_product: "whatsapp",
      to: "971501234567",
      type: "text",
      text: { preview_url: false, body: "Hello" },
    });
  });

  it("returns sanitized Meta API errors", async () => {
    configureSender();
    const result = await sendWhatsAppTextMessage(
      { to: "+971501234567", body: "Hello" },
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { code: 131047, message: "Re-engagement message requires a template" },
            }),
            { status: 400 },
          ),
        ),
    );
    expect(result).toMatchObject({
      success: false,
      responseStatus: 400,
      error: { type: "meta_api", code: 131047, requiresTemplate: true },
    });
  });

  it("constructs a template payload without selecting a production template", async () => {
    configureSender();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
    await sendWhatsAppTemplateMessage(
      {
        to: "+971501234567",
        templateName: "approved_template_name",
        languageCode: "en_US",
        components: [{ type: "body", parameters: [{ type: "text", text: "Example" }] }],
      },
      fetchMock,
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      type: "template",
      template: {
        name: "approved_template_name",
        language: { code: "en_US" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Example" }] }],
      },
    });
  });
});
