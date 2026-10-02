import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Field-level encryption for sensitive identifiers (passport numbers).
 * AES-256-GCM with a random IV per value; a separate HMAC key builds a
 * deterministic "blind index" so exact-match search works without storing
 * the plaintext.
 */

const VERSION = "v1";

function key(name: "FIELD_ENCRYPTION_KEY" | "BLIND_INDEX_KEY"): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set`);
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error(`${name} must be 32 bytes, base64 encoded`);
  return buf;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("FIELD_ENCRYPTION_KEY"), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, body]).toString("base64url")}`;
}

export function decryptField(stored: string): string {
  const [version, payload] = stored.split(":");
  if (version !== VERSION || !payload) throw new Error("Unsupported ciphertext");
  const raw = Buffer.from(payload, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key("FIELD_ENCRYPTION_KEY"), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

/** Deterministic, keyed hash of an already-normalised value. Scoped per tenant so indexes never match across agencies. */
export function blindIndex(tenantId: string, normalized: string): string {
  return createHmac("sha256", key("BLIND_INDEX_KEY")).update(`${tenantId}\u0000${normalized}`).digest("base64url").slice(0, 32);
}

/** Unguessable token for public receipt verification links. */
export function randomToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Encrypt a whole file (passport scans) before it reaches object storage. */
export function encryptBytes(data: Uint8Array): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("FIELD_ENCRYPTION_KEY"), iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from("HJE1"), iv, cipher.getAuthTag(), body]);
}

export function decryptBytes(data: Uint8Array): Buffer {
  const buf = Buffer.from(data);
  if (buf.subarray(0, 4).toString() !== "HJE1") throw new Error("Unsupported file envelope");
  const decipher = createDecipheriv("aes-256-gcm", key("FIELD_ENCRYPTION_KEY"), buf.subarray(4, 16));
  decipher.setAuthTag(buf.subarray(16, 32));
  return Buffer.concat([decipher.update(buf.subarray(32)), decipher.final()]);
}
