import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiDocumentExtractor } from "@/lib/document-ai/gemini";

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_DOCUMENT_MODEL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_DOCUMENT_MODEL;
  else process.env.GEMINI_DOCUMENT_MODEL = originalModel;
});

describe("GeminiDocumentExtractor.classifyDocument", () => {
  it("keeps specimen markings classifiable and accepts a supported canonical result", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ canonicalCode: "emirates_id" }) }] } }] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GeminiDocumentExtractor().classifyDocument({
      bytes: Buffer.from("fictional fixture"),
      mimeType: "image/png",
      filename: "sample-emirates-id.png",
    })).resolves.toEqual({ canonicalCode: "emirates_id" });

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const instruction = request.contents[0].parts[1].text as string;
    expect(instruction).toContain("SAMPLE");
    expect(instruction).toContain("NOT VALID");
    expect(instruction).toContain("do not assess authenticity");
  });
});
