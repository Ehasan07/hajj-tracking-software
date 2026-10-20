import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { deviceCheckEnabled, deviceMeta, sendSecurityAlert, TRUST_COOKIE, trustCookieOptions, trustDevice } from "@/server/device-otp";
import { resetPasswordByPhone } from "@/server/phone-otp";
import { bad, body, codeField, guard, noStore, phoneField } from "../../_shared";

/**
 * Set the new password with the SMS code. Every session is signed out, this
 * browser becomes trusted (it just proved it holds the account's phone), the
 * owner gets an alert email, and the answer names the email to sign in with.
 */
export async function POST(request: Request) {
  const blocked = guard(request, "reset-confirm", 10);
  if (blocked) return blocked;
  const input = await body(request, z.object({ phone: phoneField, code: codeField, password: z.string().max(128) }));
  if (!input) return bad("INCORRECT");
  const result = await resetPasswordByPhone(input.phone, input.code, input.password);
  if (!result.ok) {
    const status = result.reason === "incorrect" || result.reason === "weak_password" ? 400 : 410;
    return bad(result.reason.toUpperCase(), status, { remaining: result.remaining });
  }
  const meta = deviceMeta(request.headers);
  const response = NextResponse.json({ ok: true, email: result.email }, { headers: noStore });
  if (deviceCheckEnabled()) {
    response.cookies.set(TRUST_COOKIE, await trustDevice(result.userId, meta, (await cookies()).get(TRUST_COOKIE)?.value), trustCookieOptions);
  }
  void sendSecurityAlert(result.userId, "password", meta);
  return response;
}
