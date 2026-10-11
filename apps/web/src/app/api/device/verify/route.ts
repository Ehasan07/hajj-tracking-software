import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PENDING_COOKIE,
  sendSecurityAlert,
  TRUST_COOKIE,
  trustCookieOptions,
  trustDevice,
  verifyDeviceChallenge,
} from "@/server/device-otp";
import { limited, noStore, pendingChallenge } from "../_shared";

const body = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

/**
 * Check the code. On success this browser becomes a trusted device for the
 * account and the form signs in again with the password it still holds.
 */
export async function POST(request: Request) {
  const blocked = limited(request, "verify", 20);
  if (blocked) return blocked;
  const id = await pendingChallenge();
  if (!id) return NextResponse.json({ error: "NO_CHALLENGE" }, { status: 400, headers: noStore });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_CODE" }, { status: 400, headers: noStore });

  const result = await verifyDeviceChallenge(id, parsed.data.code);
  if (!result.ok) {
    const status = result.reason === "incorrect" ? 400 : 410;
    return NextResponse.json({ error: result.reason, remaining: result.remaining }, { status, headers: noStore });
  }
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  const current = (await cookies()).get(TRUST_COOKIE)?.value;
  response.cookies.set(TRUST_COOKIE, await trustDevice(result.userId, result.meta, current), trustCookieOptions);
  response.cookies.delete(PENDING_COOKIE);
  void sendSecurityAlert(result.userId, "device", result.meta);
  return response;
}
