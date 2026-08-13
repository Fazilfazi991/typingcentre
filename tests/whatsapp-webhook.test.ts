import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const getSupabaseAdminClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient }));
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";

const verifyToken = "test-whatsapp-webhook-token";

describe("WhatsApp webhook", () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;
    getSupabaseAdminClient.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function postStatus(status: Record<string, unknown>) {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const response = await POST(
      new NextRequest("https://noteitapp.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          object: "whatsapp_business_account",
          entry: [
            {
              id: "waba-id",
              changes: [
                {
                  field: "messages",
                  value: {
                    metadata: { phone_number_id: "phone-number-id" },
                    statuses: [status],
                  },
                },
              ],
            },
          ],
        }),
      }),
    );
    const logs = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    return { response, logs };
  }

  it("returns Meta's challenge for a valid verification request", async () => {
    const response = GET(
      new NextRequest(
        `https://noteitapp.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    await expect(response.text()).resolves.toBe("challenge-value");
  });

  it("rejects an incorrect verification token", () => {
    const response = GET(
      new NextRequest(
        "https://noteitapp.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=incorrect&hub.challenge=challenge-value",
      ),
    );

    expect(response.status).toBe(403);
  });

  it("acknowledges malformed webhook payloads without throwing", async () => {
    const response = await POST(
      new NextRequest("https://noteitapp.com/api/webhooks/whatsapp", {
        method: "POST",
        body: "not-json",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("acknowledges a valid messages and statuses event", async () => {
    const response = await POST(
      new NextRequest("https://noteitapp.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          object: "whatsapp_business_account",
          entry: [
            {
              id: "waba-id",
              changes: [
                {
                  field: "messages",
                  value: {
                    metadata: { phone_number_id: "phone-number-id" },
                    messages: [{ id: "message-id" }],
                    statuses: [{ id: "message-id", status: "delivered" }],
                  },
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("logs a failed status with one sanitized Meta error and status context", async () => {
    const { response, logs } = await postStatus({
      id: "failed-message-id",
      status: "failed",
      timestamp: "1770000000",
      recipient_id: "recipient-id",
      conversation: { id: "conversation-id", origin: { type: "service" } },
      pricing: { category: "service", pricing_model: "CBP" },
      errors: [
        {
          code: 131047,
          title: "Re-engagement message",
          message: "Bearer secret-token; authorization=second-secret",
          error_data: { details: "Recipient 971501234567 is outside the service window." },
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(logs).toContainEqual(
      expect.objectContaining({
        event_type: "message_status",
        message_id: "failed-message-id",
        delivery_status: "failed",
        status_timestamp: "1770000000",
        recipient_id: "recipient-id",
        conversation_id: "conversation-id",
        conversation_origin_type: "service",
        pricing_category: "service",
        pricing_model: "CBP",
      }),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        event_type: "message_status_error",
        error_code: 131047,
        error_title: "Re-engagement message",
        error_message: "Bearer [redacted]; authorization=[redacted]",
        error_details: "Recipient [redacted-number] is outside the service window.",
      }),
    );
    expect(JSON.stringify(logs)).not.toContain("secret-token");
    expect(JSON.stringify(logs)).not.toContain("second-secret");
    expect(JSON.stringify(logs)).not.toContain("971501234567");
  });

  it("logs every Meta error in a failed status", async () => {
    const { logs } = await postStatus({
      id: "multiple-errors-id",
      status: "failed",
      timestamp: "1770000001",
      errors: [
        { code: 131000, title: "First error", message: "First error" },
        { code: 131026, title: "Second error", message: "Second error" },
      ],
    });

    const errorLogs = logs.filter((log) => log.event_type === "message_status_error");
    expect(errorLogs).toHaveLength(2);
    expect(errorLogs.map((log) => log.error_code)).toEqual([131000, 131026]);
  });

  it.each(["sent", "delivered", "read"])("logs a %s status", async (deliveryStatus) => {
    const { response, logs } = await postStatus({
      id: `${deliveryStatus}-message-id`,
      status: deliveryStatus,
      timestamp: "1770000002",
      recipient_id: "recipient-id",
    });

    expect(response.status).toBe(200);
    expect(logs).toContainEqual(
      expect.objectContaining({
        event_type: "message_status",
        delivery_status: deliveryStatus,
        status_timestamp: "1770000002",
      }),
    );
  });

  it("persists a sanitized status timestamp through the service-only transition", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    getSupabaseAdminClient.mockReturnValue({ rpc });
    await postStatus({
      id: "persisted-message-id",
      status: "delivered",
      timestamp: "1770000002",
      errors: [{ code: 131000, message: "authorization=secret", error_data: { details: "Recipient 971501234567" } }],
    });
    expect(rpc).toHaveBeenCalledWith("record_whatsapp_delivery_status", expect.objectContaining({
      p_meta_message_id: "persisted-message-id",
      p_status: "delivered",
      p_event_at: new Date(1770000002 * 1000).toISOString(),
      p_error_message: "authorization=[redacted]",
      p_error_details: "Recipient [redacted-number]",
    }));
  });

  it("ignores malformed error fields without leaking their contents", async () => {
    const { response, logs } = await postStatus({
      id: "malformed-error-id",
      status: "failed",
      timestamp: "1770000003",
      errors: [
        { code: "not-a-number", title: "authorization=do-not-log-this" },
        "Bearer also-do-not-log-this",
      ],
    });

    expect(response.status).toBe(200);
    expect(logs.filter((log) => log.event_type === "malformed_status_error")).toHaveLength(2);
    expect(JSON.stringify(logs)).not.toContain("do-not-log-this");
    expect(JSON.stringify(logs)).not.toContain("also-do-not-log-this");
  });
});
