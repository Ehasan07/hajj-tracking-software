import { NextResponse } from "next/server";
import { z } from "zod";
import { smsConfigured, startPhoneReset } from "@/server/phone-otp";
import { bad, body, guard, noStore, phoneField } from "../../_shared";

/** Text a reset code to an account's mobile. Same answer whether or not the number has an account. */
export async function POST(request: Request) {
  const blocked = guard(request, "reset-send", 6);
  if (blocked) return blocked;
  if (!smsConfigured()) return bad("SMS_OFF", 503);
  const input = await body(request, z.object({ phone: phoneField }));
  if (!input) return bad("INVALID_PHONE");
  const result = await startPhoneReset(input.phone);
  if (!result.ok) return bad("INVALID_PHONE");
  return NextResponse.json(result, { headers: noStore });
}
