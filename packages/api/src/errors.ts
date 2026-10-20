import { randomBytes } from "node:crypto";

/**
 * Errors as the outside world sees them, and as the logs record them.
 *
 * A database error's message carries the failed SQL and every value bound to
 * it (names, phones, ciphertext, password hashes), so neither the client nor
 * the logs ever get it. The client gets a short code and a reference; the log
 * line gets the same reference plus what is safe to know: the error's name,
 * the Postgres error code, and the constraint, table or column involved.
 */

const refs = new WeakMap<object, string>();

/** A short reference for one error, the same every time it is asked for, to match a user's report with the log. */
export function errorRef(error: unknown): string {
  if (!error || typeof error !== "object") return randomBytes(5).toString("hex");
  let ref = refs.get(error);
  if (!ref) {
    ref = randomBytes(5).toString("hex");
    refs.set(error, ref);
  }
  return ref;
}

/** Our own codes: "PAYMENT_IMMUTABLE", raised by a database trigger, or "SHEET_LOCKED". */
const CODE = /^[A-Z][A-Z0-9_]{2,40}$/;

function chain(error: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  let current: unknown = error;
  while (current && typeof current === "object" && out.length < 6) {
    out.push(current as Record<string, unknown>);
    current = (current as { cause?: unknown }).cause;
  }
  return out;
}

const isPostgres = (e: Record<string, unknown>) => typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code) && "severity" in e;

/** The code a database trigger raised (e.g. "PAYMENT_IMMUTABLE"), which is safe to show; null for anything else. */
export function publicReason(error: unknown): string | null {
  for (const e of chain(error)) {
    if (isPostgres(e) && typeof e.message === "string" && CODE.test(e.message)) return e.message;
  }
  return null;
}

/** One log line about an error, without query text, bound values or messages that may quote user input. */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  for (const e of chain(error)) {
    const name = typeof e.name === "string" ? e.name : "Error";
    if (isPostgres(e)) {
      const bits = [`pg=${String(e.code)}`];
      for (const k of ["constraint_name", "table_name", "column_name", "routine"]) if (typeof e[k] === "string") bits.push(`${k.replace("_name", "")}=${String(e[k])}`);
      if (typeof e.message === "string" && CODE.test(e.message)) bits.push(e.message);
      parts.push(`${name}(${bits.join(" ")})`);
    } else if (name === "DrizzleQueryError" || (typeof e.message === "string" && e.message.startsWith("Failed query:"))) {
      parts.push(name);
    } else if (name === "TRPCError") {
      const message = typeof e.message === "string" && CODE.test(e.message) ? ` ${e.message}` : "";
      parts.push(`TRPCError(${String(e.code)}${message})`);
    } else {
      const message = typeof e.message === "string" ? e.message.replace(/\s+/g, " ").slice(0, 160) : "";
      parts.push(message ? `${name}: ${message}` : name);
    }
  }
  return parts.join(" <- ") || "unknown error";
}
