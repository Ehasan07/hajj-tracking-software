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
