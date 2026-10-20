import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/session";
import { confirmPhoneVerification } from "@/server/phone-otp";
import { bad, body, codeField, guard, noStore } from "../_shared";

/** The code from the SMS: the number becomes the account's verified mobile. */
export async function POST(request: Request) {
  const blocked = guard(request, "verify", 20);
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return bad("UNAUTHORIZED", 401);
  const input = await body(request, z.object({ code: codeField }));
  if (!input) return bad("INCORRECT");
  const result = await confirmPhoneVerification(session.user.id, input.code);
  if (!result.ok) return bad(result.reason.toUpperCase(), result.reason === "incorrect" ? 400 : 410, { remaining: result.remaining });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
