import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";

const verifyToken = "test-whatsapp-webhook-token";

describe("WhatsApp webhook", () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;
  });

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
});
