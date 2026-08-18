import "server-only";
import { documentExtractionJsonSchema, documentExtractionSchema } from "./schema";
import { DOCUMENT_EXTRACTION_INSTRUCTION } from "./prompts";
import { CANONICAL_DOCUMENT_CODES, canonicalDocumentClassificationSchema } from "./canonical-taxonomy";
import type { DocumentExtractionProvider, ExtractDocumentInput } from "./types";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

export class GeminiDocumentExtractor implements DocumentExtractionProvider {
  readonly name = "gemini";
  async extract(input: ExtractDocumentInput) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("Document AI is not configured.");
    const model = process.env.GEMINI_DOCUMENT_MODEL?.trim() || DEFAULT_MODEL;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: input.mimeType, data: Buffer.from(input.bytes).toString("base64") }, }, { text: DOCUMENT_EXTRACTION_INSTRUCTION }]}], generationConfig: { responseMimeType: "application/json", responseJsonSchema: documentExtractionJsonSchema, temperature: 0 } }),
    });
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: input.mimeType, data: Buffer.from(input.bytes).toString("base64") } }, { text: `Classify only this document. Return JSON {"canonicalCode": string|null}. Allowed codes: ${CANONICAL_DOCUMENT_CODES.join(", ")}. Return null when evidence is insufficient; never guess visa or insurance subtypes.` }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", additionalProperties: false, properties: { canonicalCode: { type: ["string", "null"], enum: [...CANONICAL_DOCUMENT_CODES, null] } }, required: ["canonicalCode"] }, temperature: 0 } }),
    });
    if (!response.ok) throw new Error("Document classification is unavailable.");
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
    if (!text) throw new Error("Document classification returned no result.");
    let value: unknown; try { value = JSON.parse(text); } catch { throw new Error("Document classification returned an invalid result."); }
    const parsed = canonicalDocumentClassificationSchema.safeParse(value);
    if (!parsed.success) throw new Error("Document classification returned an invalid result.");
    return parsed.data;
  }
}
