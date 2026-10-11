import { isIP } from "node:net";

/**
 * The visitor's address, from headers that can't be forged. Behind nginx,
 * `X-Real-IP` is set from the TCP peer and overwrites anything the client
 * sent. `X-Forwarded-For` is trusted only when it holds a single address: a
 * client can prepend its own entries, so a list is never believed. The app
 * itself only listens on localhost, so every request comes through nginx.
 */
export function clientIp(headers: Headers | null | undefined): string | null {
  if (!headers) return null;
  const real = headers.get("x-real-ip")?.trim();
  if (real && isIP(real)) return real;
  const forwarded = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (forwarded.length === 1 && isIP(forwarded[0]!)) return forwarded[0]!;
  return null;
}
