import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { DEFAULT_MAX_DOCUMENT_SIZE_BYTES } from "@/features/documents/constants";

const r2EnvironmentSchema = z.object({
  R2_ACCOUNT_ID: z.string().trim().min(1),
  R2_ACCESS_KEY_ID: z.string().trim().min(1),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
  R2_BUCKET_NAME: z.string().trim().min(3),
  R2_ENDPOINT: z.string().url(),
  R2_PRESIGNED_UPLOAD_TTL_SECONDS: z.coerce.number().int().min(1).max(300).default(300),
  R2_PRESIGNED_DOWNLOAD_TTL_SECONDS: z.coerce.number().int().min(1).max(300).default(300),
  R2_MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024)
    .default(DEFAULT_MAX_DOCUMENT_SIZE_BYTES),
});

export type R2Configuration = z.infer<typeof r2EnvironmentSchema>;

export function getR2Configuration(): R2Configuration {
  const parsed = r2EnvironmentSchema.safeParse({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_PRESIGNED_UPLOAD_TTL_SECONDS: process.env.R2_PRESIGNED_UPLOAD_TTL_SECONDS,
    R2_PRESIGNED_DOWNLOAD_TTL_SECONDS: process.env.R2_PRESIGNED_DOWNLOAD_TTL_SECONDS,
    R2_MAX_FILE_SIZE_BYTES: process.env.R2_MAX_FILE_SIZE_BYTES,
  });
  if (!parsed.success) throw new Error("Private document storage is not configured.");
  return parsed.data;
}

export function getR2Client(config = getR2Configuration()) {
  return new S3Client({
    region: "auto",
    endpoint: config.R2_ENDPOINT,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}
