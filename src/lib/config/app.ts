export const appConfig = {
  name: "Note It",
  description: "Document expiry management for UAE typing centres.",
  timezone: "Asia/Dubai",
  locale: "en-AE",
  currency: "AED",
  maximumUploadBytes: 15 * 1024 * 1024,
  supportedUploadMimeTypes: ["application/pdf", "image/jpeg", "image/png"] as const,
  reminderThresholds: [90, 60, 30, 15, 7, 3, 0] as const,
} as const;
