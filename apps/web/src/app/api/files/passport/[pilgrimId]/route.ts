import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { decryptBytes, encryptBytes } from "@hajj/api/crypto";
import { getSession } from "@/server/session";
import { getObject, putObject, sniffImageOrPdf } from "@/server/storage";
import { api } from "@/trpc/server";

const MAX_BYTES = 8 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as const;

function fail(error: unknown) {
  if (error instanceof TRPCError) {
    return Response.json({ error: error.message }, { status: getHTTPStatusCodeFromError(error) });
  }
  console.error("[files/passport]", error);
  return Response.json({ error: "INTERNAL" }, { status: 500 });
}

type Params = { params: Promise<{ pilgrimId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { pilgrimId } = await params;
    const session = await getSession();
    if (!session?.session.activeOrganizationId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const tenantId = session.session.activeOrganizationId;

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES + 64 * 1024) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageOrPdf(bytes);
    if (!type) return Response.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });

    const caller = await api();
    await caller.pilgrims.get({ id: pilgrimId }); // existence + tenant access check
    const key = `tenants/${tenantId}/pilgrims/${pilgrimId}/passport-${randomUUID()}.${EXT[type]}.enc`;
    await putObject(key, encryptBytes(bytes), "application/octet-stream");
    await caller.pilgrims.attachPassportScan({ id: pilgrimId, key });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { pilgrimId } = await params;
    const caller = await api();
    const key = await caller.pilgrims.passportScanKey({ id: pilgrimId });
    if (!key) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    const { body } = await getObject(key);
    const plain = decryptBytes(body);
    const type = sniffImageOrPdf(plain) ?? "application/octet-stream";
    return new Response(new Uint8Array(plain), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
