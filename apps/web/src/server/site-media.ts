import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { db } from "@hajj/db";
import { getObject, putObject, sniffImageOrPdf, storageAdded } from "./storage";

/**
 * Pictures for an agency's public website. Each upload is decoded and drawn
 * again as WebP at a sensible size: that strips camera metadata (phone photos
 * carry GPS), shrinks 8 MB photos to a few hundred KB, and means nothing but
 * a plain image is ever stored, whatever the file claimed to be.
 */

export const SITE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const SIZES = {
  logo: { width: 512, height: 512, fit: "inside" },
  hero: { width: 2000, height: 1600, fit: "inside" },
  gallery: { width: 1600, height: 1600, fit: "inside" },
  post: { width: 1600, height: 1200, fit: "inside" },
  package: { width: 1200, height: 900, fit: "inside" },
} as const;

export type SiteImagePurpose = keyof typeof SIZES;

export function isSiteImagePurpose(value: string): value is SiteImagePurpose {
  return value in SIZES;
}

export class SiteImageError extends Error {}

/** Re-encode and store; returns the storage key. */
export async function storeSiteImage(tenantId: string, purpose: SiteImagePurpose, bytes: Uint8Array): Promise<string> {
  const kind = sniffImageOrPdf(bytes);
  if (!kind || kind === "application/pdf") throw new SiteImageError("BAD_IMAGE");
  let webp: Buffer;
  try {
    webp = await sharp(bytes, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate() // honour the camera's orientation before the metadata is dropped
      .resize({ ...SIZES[purpose], withoutEnlargement: true })
      .webp({ quality: purpose === "logo" ? 90 : 80, effort: 4 })
      .toBuffer();
  } catch {
    throw new SiteImageError("BAD_IMAGE");
  }
  const key = `tenants/${tenantId}/site/${randomUUID()}.webp`;
  await putObject(key, webp, "image/webp");
  storageAdded(tenantId, webp.length);
  return key;
}

/** The address a stored website image is served from. */
export function siteImageUrl(key: string | null | undefined): string | null {
  const m = key?.match(/^tenants\/([^/]+)\/site\/([0-9a-f-]{36})\.webp$/);
  return m ? `/api/site/media/${m[1]}/${m[2]}` : null;
}

/** The stored bytes, only while the website still uses the image. */
export async function readSiteImage(tenantId: string, id: string): Promise<Uint8Array | null> {
  const key = `tenants/${tenantId}/site/${id}.webp`;
  const [row] = (await db.execute(sql`select site_media_visible(${tenantId}, ${key}) as visible`)) as unknown as [{ visible: boolean }?];
  if (!row?.visible) return null;
  try {
    return (await getObject(key)).body;
  } catch {
    return null;
  }
}
