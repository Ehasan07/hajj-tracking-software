import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, limitKey } from "@/server/client-ip";
import { allow } from "@/server/rate-limit";

export const noStore = { "cache-control": "no-store" };

/**
 * Refuse a request from another site (a form or script elsewhere posting
 * here with the visitor's cookies), then cap requests per address.
 */
export function guard(request: Request, name: string, max: number) {
  const origin = request.headers.get("origin");
  const own = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3100").origin;
  if (origin && origin !== own) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const ip = limitKey(clientIp(request.headers));
  if (!allow(`phone:${name}:${ip}`, max, 60_000)) return NextResponse.json({ error: "TOO_MANY" }, { status: 429, headers: noStore });
  return null;
}

export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | null> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

export const phoneField = z.string().trim().min(10).max(20);
export const codeField = z.string().trim().regex(/^\d{6}$/);

export function bad(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: noStore });
}
