import { and, eq, isNull, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@hajj/db";
import { trustedDevices } from "@hajj/db/schema";
import { auth } from "@/server/auth";
import { tokenHash, TRUST_COOKIE, unsign } from "@/server/device-otp";
import { noStore } from "../_shared";

/** Sign out everywhere else: end other sessions and forget every other trusted device. */
export async function POST() {
  const h = await headers();
  const current = await auth.api.getSession({ headers: h });
  if (!current) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: noStore });
  const token = unsign((await cookies()).get(TRUST_COOKIE)?.value);
  const revoked = await db
    .update(trustedDevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(trustedDevices.userId, current.user.id), isNull(trustedDevices.revokedAt), ne(trustedDevices.tokenHash, token ? tokenHash(token) : "")))
    .returning({ id: trustedDevices.id });
  await auth.api.revokeOtherSessions({ headers: h });
  return NextResponse.json({ ok: true, devices: revoked.length }, { headers: noStore });
}
