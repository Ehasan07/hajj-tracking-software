import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPhoneReset } from "@/server/phone-otp";
import { bad, body, codeField, guard, noStore, phoneField } from "../../_shared";

export async function POST(request: Request) {
  const blocked = guard(request, "reset-check", 20);
  if (blocked) return blocked;
  const input = await body(request, z.object({ phone: phoneField, code: codeField }));
  if (!input) return bad("INCORRECT");
  const result = await checkPhoneReset(input.phone, input.code);
  if (!result.ok) return bad(result.reason.toUpperCase(), result.reason === "incorrect" ? 400 : 410, { remaining: result.remaining });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
