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

/**
 * The address as limits count it. One home or phone connection is given a
 * whole IPv6 /64, so counting single IPv6 addresses would hand one person
 * billions of fresh allowances; IPv6 is counted by its /64 network instead.
 */
export function limitKey(ip: string | null): string {
  if (!ip) return "unknown";
  if (isIP(ip) !== 6) return ip;
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:") && isIP(lower.slice(7)) === 4) return lower.slice(7);
  const [head = "", tail] = lower.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups = tail === undefined ? front : [...front, ...Array<string>(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
