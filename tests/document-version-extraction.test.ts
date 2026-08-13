import { describe, expect, it } from "vitest";
import { hasCurrentVersionAlreadyBeenAnalyzed } from "@/lib/document-ai/version-state";

describe("document version extraction state", () => {
  const base = {
    versionId: "version-2",
    currentVersionId: "version-2",
    finalizedAt: "2026-08-14T00:10:00.000Z",
    extractionStatus: "confirmed",
    extractedAt: "2026-08-14T00:00:00.000Z",
  };

  it("allows a newly finalized replacement version to be analyzed", () => {
    expect(hasCurrentVersionAlreadyBeenAnalyzed(base)).toBe(false);
  });

  it("blocks repeat analysis after the current version was extracted", () => {
    expect(hasCurrentVersionAlreadyBeenAnalyzed({ ...base, extractedAt: "2026-08-14T00:11:00.000Z" })).toBe(true);
  });

  it("blocks analysis of a non-current version", () => {
    expect(hasCurrentVersionAlreadyBeenAnalyzed({ ...base, versionId: "version-1" })).toBe(true);
  });

  it("allows documents that have not reached review yet", () => {
    expect(hasCurrentVersionAlreadyBeenAnalyzed({ ...base, extractionStatus: "failed" })).toBe(false);
  });
});
