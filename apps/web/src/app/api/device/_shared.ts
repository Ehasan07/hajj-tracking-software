import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PENDING_COOKIE, unsign } from "@/server/device-otp";
import { clientIp, limitKey } from "@/server/client-ip";
import { allow } from "@/server/rate-limit";

/** The pending code check this browser started at sign-in, or null. */
export async function pendingChallenge(): Promise<string | null> {
  return unsign((await cookies()).get(PENDING_COOKIE)?.value);
}

/** Per-address cap on top of the per-code attempt limit. */
export function limited(request: Request, name: string, max: number) {
  return allow(`device:${name}:${limitKey(clientIp(request.headers))}`, max, 60_000) ? null : NextResponse.json({ error: "TOO_MANY" }, { status: 429 });
}

export const noStore = { "cache-control": "no-store" };
