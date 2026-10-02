import "server-only";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const globalForS3 = globalThis as unknown as { __hajjS3?: S3Client; __hajjBucketReady?: Promise<void> };

function client(): S3Client {
  return (globalForS3.__hajjS3 ??= new S3Client({
    endpoint: env("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: env("S3_ACCESS_KEY"), secretAccessKey: env("S3_SECRET_KEY") },
  }));
}

const bucket = () => env("S3_BUCKET");

/** The bucket is private; nothing in it is ever served directly, only through authorised routes. */
function ensureBucket(): Promise<void> {
  return (globalForS3.__hajjBucketReady ??= (async () => {
    try {
      await client().send(new HeadBucketCommand({ Bucket: bucket() }));
    } catch {
      await client().send(new CreateBucketCommand({ Bucket: bucket() }));
    }
  })().catch((error) => {
    globalForS3.__hajjBucketReady = undefined;
    throw error;
  }));
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await ensureBucket();
  await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<{ body: Uint8Array; contentType: string }> {
  const result = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = await result.Body!.transformToByteArray();
  return { body, contentType: result.ContentType ?? "application/octet-stream" };
}

/** Identify the real file type from its first bytes; the browser-supplied type is not trusted. */
export function sniffImageOrPdf(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  if (String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}
