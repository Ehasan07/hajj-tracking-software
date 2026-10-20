import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/session";
import { smsConfigured, startPhoneVerification } from "@/server/phone-otp";
import { bad, body, guard, noStore, phoneField } from "../_shared";

/** Text a code to the mobile number the signed-in person is adding to their account. */
export async function POST(request: Request) {
  const blocked = guard(request, "send", 6);
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return bad("UNAUTHORIZED", 401);
  if (!smsConfigured()) return bad("SMS_OFF", 503);
  const input = await body(request, z.object({ phone: phoneField }));
  if (!input) return bad("INVALID_PHONE");
  const result = await startPhoneVerification(session.user.id, input.phone);
  if (!result.ok) return bad(result.reason.toUpperCase(), result.reason === "wait" ? 429 : 400, { wait: result.wait });
  return NextResponse.json(result, { headers: noStore });
}
