import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const META_SIGNATURE_PATTERN = /^sha256=([a-f0-9]{64})$/i;

export type MetaWebhookSignatureResult = "valid" | "missing" | "malformed" | "invalid";

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): MetaWebhookSignatureResult {
  if (!signatureHeader) return "missing";
  const match = META_SIGNATURE_PATTERN.exec(signatureHeader);
  if (!match) return "malformed";

  const received = Buffer.from(match[1], "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return received.length === expected.length && timingSafeEqual(received, expected) ? "valid" : "invalid";
}
