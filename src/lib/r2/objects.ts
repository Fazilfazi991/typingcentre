import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2Configuration } from "./client";
import { measureAsync } from "@/lib/performance/timing";

export async function createDocumentUploadUrl(
  objectKey: string,
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
) {
  const config = getR2Configuration();
  return measureAsync("signed_upload_creation", () => getSignedUrl(
    getR2Client(config),
    new PutObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey, ContentType: mimeType }),
    { expiresIn: config.R2_PRESIGNED_UPLOAD_TTL_SECONDS },
  ));
}

export async function inspectDocumentObject(objectKey: string) {
  const config = getR2Configuration();
  return measureAsync("upload_head_verification", () => getR2Client(config).send(
    new HeadObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey }),
  ));
}

export async function deleteDocumentObject(objectKey: string) {
  const config = getR2Configuration();
  await getR2Client(config).send(
    new DeleteObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey }),
  );
}

export async function readDocumentObject(objectKey: string) {
  const config = getR2Configuration();
  const object = await measureAsync("document_download", () => getR2Client(config).send(
    new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: objectKey }),
  ));
  if (!object.Body) throw new Error("Document object is unavailable.");
  return new Uint8Array(await object.Body.transformToByteArray());
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
