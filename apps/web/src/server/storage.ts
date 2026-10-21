import "server-only";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
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

/** Every object under a prefix: key, size and when it was stored. */
export async function listObjects(prefix: string): Promise<{ key: string; size: number; modified: Date }[]> {
  await ensureBucket();
  const out: { key: string; size: number; modified: Date }[] = [];
  let token: string | undefined;
  do {
    const page = await client().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents ?? []) if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0, modified: o.LastModified ?? new Date() });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    if (chunk.length) await client().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
  }
}

/* ------------------------------------------------------------ space per agency */

/** Space an agency gets when its plan doesn't say (MB). */
export const DEFAULT_STORAGE_MB = Number(process.env.STORAGE_MB_DEFAULT ?? 2048);
const used = new Map<string, { bytes: number; at: number }>();

/** The plan's allowance in bytes; null is unlimited. A plan without the setting gets the default. */
export function storageAllowance(limits: { storageMb?: number | null } | null | undefined): number | null {
  const mb = limits && limits.storageMb !== undefined ? limits.storageMb : DEFAULT_STORAGE_MB;
  return mb === null ? null : mb * 1024 * 1024;
}

/** Bytes an agency keeps, counted from the store itself (remembered for a minute). */
export async function storageUsed(tenantId: string): Promise<number> {
  const hit = used.get(tenantId);
  if (hit && Date.now() - hit.at < 60_000) return hit.bytes;
  const bytes = (await listObjects(`tenants/${tenantId}/`)).reduce((sum, o) => sum + o.size, 0);
  used.set(tenantId, { bytes, at: Date.now() });
  return bytes;
}

/** Whether `incoming` more bytes would go past the agency's allowance. */
export async function storageFull(tenantId: string, limits: { storageMb?: number | null } | null | undefined, incoming: number) {
  const allowance = storageAllowance(limits);
  return allowance !== null && (await storageUsed(tenantId)) + incoming > allowance;
}

/** Count a file just stored, so the next check needn't list the store again. */
export function storageAdded(tenantId: string, bytes: number) {
  const hit = used.get(tenantId);
  if (hit) hit.bytes += bytes;
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
