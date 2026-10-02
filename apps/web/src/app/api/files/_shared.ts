import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

export function fail(error: unknown, where: string) {
  if (error instanceof TRPCError) {
    return Response.json({ error: error.message }, { status: getHTTPStatusCodeFromError(error) });
  }
  console.error(`[files] ${where}`, error);
  return Response.json({ error: "INTERNAL" }, { status: 500 });
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
