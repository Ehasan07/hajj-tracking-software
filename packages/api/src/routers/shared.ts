import { z } from "zod";
import { normalizeBdPhone, parseAmount } from "@hajj/core";

/** Amounts travel as strings ("1,50,000" or "১৫০০০০.৫০") and are parsed to paisa on the server. */
export const amountInput = z
  .string()
  .trim()
  .min(1)
  .refine((v) => {
    try {
      return parseAmount(v) > 0;
    } catch {
      return false;
    }
  }, "INVALID_AMOUNT");

export const phoneInput = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeBdPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "INVALID_PHONE" });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** An amount that may be zero, e.g. a discount or the part paid now on credit. */
export const amountOrZero = z
  .string()
  .trim()
  .min(1)
  .refine((v) => {
    try {
      return parseAmount(v) >= 0;
    } catch {
      return false;
    }
  }, "INVALID_AMOUNT");

export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "INVALID_DATE");

export const paymentMethods = [
  "cash",
  "bkash",
  "nagad",
  "rocket",
  "bank",
  "card",
  "other",
] as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * A storage key exactly as the upload route makes it:
 * tenants/<agency>/pilgrims/<pilgrim>/<kind>-<uuid>.<ext>.enc. Nothing else
 * passes, so a key with "..", another folder or another agency can't be saved.
 */
export function isPilgrimFileKey(key: string, tenantId: string, pilgrimId: string, kind: string): boolean {
  const prefix = `tenants/${tenantId}/pilgrims/${pilgrimId}/`;
  if (!/^[a-z_]{2,40}$/.test(kind) || !key.startsWith(prefix)) return false;
  return new RegExp(`^${kind}-${UUID}\\.(jpg|png|webp|pdf)\\.enc$`).test(key.slice(prefix.length));
}

/** A LIKE pattern matching the text anywhere, with %, _ and backslash taken literally. */
export const containing = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
