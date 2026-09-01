import "server-only";
import { documentExtractionJsonSchema, documentExtractionSchema } from "./schema";
import { DOCUMENT_EXTRACTION_INSTRUCTION } from "./prompts";
import { CANONICAL_DOCUMENT_CODES, canonicalDocumentClassificationSchema, canonicalDocumentCodeSchema } from "./canonical-taxonomy";
import type { DocumentExtractionProvider, ExtractDocumentInput } from "./types";
import { measureAsync } from "@/lib/performance/timing";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const PROVIDER_TIMEOUT_MS = 60_000;
const inlineBase64 = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");

type ClassificationLogOutcome = "provider_invoked" | "provider_error" | "schema_invalid" | "unresolved" | "unsupported_code" | "canonical_resolved" | "tenant_mapping_missing" | "tenant_mapping_duplicate";

export function logClassificationOutcome(outcome: ClassificationLogOutcome) {
  // Keep runtime diagnostics useful without recording document content, IDs, prompts, or provider payloads.
  process.stdout.write(`${JSON.stringify({ event: "quick_scan_classification", outcome })}\n`);
}

export class GeminiDocumentExtractor implements DocumentExtractionProvider {
  readonly name = "gemini";
  async extract(input: ExtractDocumentInput) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("Document AI is not configured.");
    const model = process.env.GEMINI_DOCUMENT_MODEL?.trim() || DEFAULT_MODEL;
    const response = await measureAsync("gemini_extract", () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: input.mimeType, data: inlineBase64(input.bytes) }, }, { text: DOCUMENT_EXTRACTION_INSTRUCTION }]}], generationConfig: { responseMimeType: "application/json", responseJsonSchema: documentExtractionJsonSchema, temperature: 0 } }),
    }));
    if (!response.ok) throw new Error("Document analysis is unavailable.");
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
    if (!text) throw new Error("Document analysis returned no result.");
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(text); } catch { throw new Error("Document analysis returned an invalid result."); }
    const extraction = documentExtractionSchema.safeParse(parsedJson);
    if (!extraction.success) throw new Error("Document analysis returned an invalid result.");
    return { extraction: extraction.data, model };
  }
  async classifyDocument(input: ExtractDocumentInput) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("Document AI is not configured.");
    const model = process.env.GEMINI_DOCUMENT_MODEL?.trim() || DEFAULT_MODEL;
    let response: Response;
    try {
      logClassificationOutcome("provider_invoked");
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: input.mimeType, data: Buffer.from(input.bytes).toString("base64") } }, { text: `Classify this document's format/category only. A SAMPLE, TEST, SPECIMEN, VOID, NOT VALID, or fictional-data marking does not make the category unresolved; do not assess authenticity. Return JSON {"canonicalCode": string|null}. Allowed codes: ${CANONICAL_DOCUMENT_CODES.join(", ")}. Return null when evidence is insufficient; never guess visa or insurance subtypes.` }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", additionalProperties: false, properties: { canonicalCode: { type: ["string", "null"], enum: [...CANONICAL_DOCUMENT_CODES, null] } }, required: ["canonicalCode"] }, temperature: 0 } }),
      });
    } catch {
      logClassificationOutcome("provider_error");
      throw new Error("Document classification is unavailable.");
    }
    if (!response.ok) {
      logClassificationOutcome("provider_error");
      throw new Error("Document classification is unavailable.");
    }
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
    if (!text) {
      logClassificationOutcome("schema_invalid");
      throw new Error("Document classification returned no result.");
    }
    let value: unknown;
    try { value = JSON.parse(text); } catch {
      logClassificationOutcome("schema_invalid");
      throw new Error("Document classification returned an invalid result.");
    }
    const candidateCode = typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as { canonicalCode?: unknown }).canonicalCode
      : undefined;
    if (typeof candidateCode === "string" && !canonicalDocumentCodeSchema.safeParse(candidateCode).success) {
      logClassificationOutcome("unsupported_code");
      throw new Error("Document classification returned an unsupported type.");
    }
    const parsed = canonicalDocumentClassificationSchema.safeParse(value);
    if (!parsed.success) {
      logClassificationOutcome("schema_invalid");
      throw new Error("Document classification returned an invalid result.");
    }
    logClassificationOutcome(parsed.data.canonicalCode ? "canonical_resolved" : "unresolved");
    return parsed.data;
  }
}
