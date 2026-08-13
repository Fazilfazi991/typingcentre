export function hasCurrentVersionAlreadyBeenAnalyzed(input: {
  versionId: string;
  currentVersionId: string | null;
  finalizedAt: string | null;
  extractionStatus: string;
  extractedAt: string | null;
}) {
  if (!["confirmed", "review_required"].includes(input.extractionStatus)) return false;
  if (input.versionId !== input.currentVersionId) return true;
  if (!input.finalizedAt || !input.extractedAt) return true;

  const finalizedAt = Date.parse(input.finalizedAt);
  const extractedAt = Date.parse(input.extractedAt);
  if (!Number.isFinite(finalizedAt) || !Number.isFinite(extractedAt)) return true;
  return extractedAt >= finalizedAt;
}
