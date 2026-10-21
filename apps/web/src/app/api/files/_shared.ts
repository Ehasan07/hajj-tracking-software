import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { describeError, errorRef } from "@hajj/api/errors";
import { allow } from "@/server/rate-limit";
import { storageFull } from "@/server/storage";
import { api } from "@/trpc/server";

export function fail(error: unknown, where: string) {
  if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
    return Response.json({ error: error.message }, { status: getHTTPStatusCodeFromError(error) });
  }
  // The detail stays in the server log; the browser gets a reference to quote.
  const ref = errorRef(error);
  console.error(`[files] ${where} ref=${ref} ${describeError(error)}`);
  return Response.json({ error: "INTERNAL", ref }, { status: 500 });
}

const UPLOADS_PER_10_MIN = 60;

/**
 * Checks before an upload is read: it comes from this site (not a form
 * elsewhere posting with the visitor's cookies), it says how big it is and is
 * within the limit (so it can't stream on unchecked), and the person hasn't
 * sent more than a busy office would in ten minutes.
 */
export function uploadRefused(request: Request, userId: string, maxBytes: number): Response | null {
  const origin = request.headers.get("origin");
  const own = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3100").origin;
  if (origin && origin !== own) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length) || length <= 0) return Response.json({ error: "LENGTH_REQUIRED" }, { status: 411 });
  if (length > maxBytes + 64 * 1024) return Response.json({ error: "TOO_LARGE" }, { status: 413 });
  if (!allow(`upload:${userId}`, UPLOADS_PER_10_MIN, 10 * 60_000)) return Response.json({ error: "TOO_MANY" }, { status: 429 });
  return null;
}

/**
 * Checks before anything is stored: the agency can still make changes (an
 * expired one could otherwise fill the store with files it can't attach), and
 * the file fits in what its plan allows.
 */
export async function storeRefused(tenantId: string, incoming: number): Promise<Response | null> {
  const subscription = await (await api()).tenant.subscription();
  if (!subscription || subscription.inactive) return Response.json({ error: "SUBSCRIPTION_INACTIVE" }, { status: 403 });
  if (await storageFull(tenantId, subscription.limits, incoming)) return Response.json({ error: "STORAGE_FULL" }, { status: 507 });
  return null;
}

/** Decrypted files are only ever shown inline, never cached, and never run as a page. */
export function fileResponse(bytes: Uint8Array, contentType: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
