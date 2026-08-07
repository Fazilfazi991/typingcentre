import "server-only";
import { GeminiDocumentExtractor } from "./gemini";
import type { DocumentExtractionProvider, ExtractDocumentInput } from "./types";

export async function extractDocument(input: ExtractDocumentInput) {
  const providerName = process.env.DOCUMENT_AI_PROVIDER?.trim() || "gemini";
  let provider: DocumentExtractionProvider;
  if (providerName === "gemini") provider = new GeminiDocumentExtractor();
  else throw new Error("The selected document AI provider is not available.");
  const result = await provider.extract(input);
  return { ...result, provider: provider.name };
}
