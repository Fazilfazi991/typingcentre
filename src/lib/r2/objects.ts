import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2Configuration } from "./client";

export async function createDocumentUploadUrl(
  objectKey: string,
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
) {
  const config = getR2Configuration();
  return getSignedUrl(
    getR2Client(config),
    new PutObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey, ContentType: mimeType }),
    { expiresIn: config.R2_PRESIGNED_UPLOAD_TTL_SECONDS },
  );
}

export async function inspectDocumentObject(objectKey: string) {
  const config = getR2Configuration();
  return getR2Client(config).send(
    new HeadObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey }),
  );
}

export async function createDocumentDownloadUrl(
  objectKey: string,
  mimeType: string,
  filename: string,
  disposition: "inline" | "attachment",
) {
  const config = getR2Configuration();
  return getSignedUrl(
    getR2Client(config),
    new GetObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: objectKey,
      ResponseContentType: mimeType,
      ResponseContentDisposition: `${disposition}; filename="${filename.replace(/["\\]/g, "-")}"`,
    }),
    { expiresIn: config.R2_PRESIGNED_DOWNLOAD_TTL_SECONDS },
  );
}
