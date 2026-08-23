import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inspectWhatsAppManagement } from "@/lib/whatsapp/management";

const originalEnvironment = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION,
};

describe("WhatsApp management inspection", () => {
  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "1300612485320552";
    process.env.WHATSAPP_GRAPH_API_VERSION = "v25.0";
  });

  afterEach(() => {
    if (originalEnvironment.accessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalEnvironment.accessToken;
    if (originalEnvironment.wabaId === undefined) delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    else process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = originalEnvironment.wabaId;
    if (originalEnvironment.graphVersion === undefined)
      delete process.env.WHATSAPP_GRAPH_API_VERSION;
    else process.env.WHATSAPP_GRAPH_API_VERSION = originalEnvironment.graphVersion;
  });

  it("stops before template listing when management permission is absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ permission: "whatsapp_business_messaging", status: "granted" }],
        }),
        { status: 200 },
      ),
    );
    const result = await inspectWhatsAppManagement("document_expiry_summary", fetchMock);
    expect(result.permissions).toEqual({
      whatsapp_business_management: "unknown",
      whatsapp_business_messaging: "granted",
    });
    expect(result.templatesQueried).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("handles pagination and returns every matching template locale", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { permission: "whatsapp_business_management", status: "granted" },
              { permission: "whatsapp_business_messaging", status: "granted" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "1", name: "hello_world", language: "en_US" }],
            paging: { cursors: { after: "next-page" } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "2",
                name: "document_expiry_summary",
                language: "en_US",
                status: "APPROVED",
                category: "UTILITY",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await inspectWhatsAppManagement("document_expiry_summary", fetchMock);
    expect(result.permissions).toEqual({
      whatsapp_business_management: "granted",
      whatsapp_business_messaging: "granted",
    });
    expect(result.pagesFetched).toBe(2);
    expect(result.paginationComplete).toBe(true);
    expect(result.returnedTemplateCount).toBe(2);
    expect(result.matchingTemplates).toEqual([
      expect.objectContaining({ name: "document_expiry_summary", language: "en_US" }),
    ]);
    expect(String(fetchMock.mock.calls[2][0])).toContain("after=next-page");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });

  it("can inspect v1 and v2 together without creating or sending either template", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [
            { permission: "whatsapp_business_management", status: "granted" },
            { permission: "whatsapp_business_messaging", status: "granted" },
          ] }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [
            { id: "1", name: "document_expiry_summary", language: "en", status: "APPROVED", category: "UTILITY" },
            { id: "2", name: "document_expiry_summary_v2", language: "en_US", status: "APPROVED", category: "UTILITY" },
            { id: "3", name: "unrelated_template", language: "en_US", status: "APPROVED", category: "UTILITY" },
          ] }),
          { status: 200 },
        ),
      );

    const result = await inspectWhatsAppManagement(
      ["document_expiry_summary", "document_expiry_summary_v2"],
      fetchMock,
    );
    expect(result.matchingTemplates.map((template) => template.name)).toEqual([
      "document_expiry_summary",
      "document_expiry_summary_v2",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every((call) => call[1]?.method === undefined)).toBe(true);
  });
});
