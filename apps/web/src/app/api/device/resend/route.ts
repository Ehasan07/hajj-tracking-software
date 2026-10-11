import { NextResponse } from "next/server";
import { resendDeviceChallenge } from "@/server/device-otp";
import { limited, noStore, pendingChallenge } from "../_shared";

export async function POST(request: Request) {
  const blocked = limited(request, "resend", 6);
  if (blocked) return blocked;
  const id = await pendingChallenge();
  if (!id) return NextResponse.json({ error: "NO_CHALLENGE" }, { status: 400, headers: noStore });
  const result = await resendDeviceChallenge(id);
  if (!result.ok) return NextResponse.json({ error: result.wait ? "WAIT" : "NO_CHALLENGE", wait: result.wait }, { status: 429, headers: noStore });
  return NextResponse.json({ ok: true, resendIn: result.view.resendIn }, { headers: noStore });
}
