import { randomUUID } from "node:crypto";
import { encryptBytes } from "@hajj/api/crypto";
import { documentType } from "@hajj/core";
import { getSession } from "@/server/session";
import { putObject, sniffImageOrPdf } from "@/server/storage";
import { api } from "@/trpc/server";
import { fail } from "../../_shared";

const MAX_BYTES = 8 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as const;

/** Upload one paper for a pilgrim: form fields "type" (document code) and "file". Stored encrypted. */
export async function POST(request: Request, { params }: { params: Promise<{ pilgrimId: string }> }) {
  try {
    const { pilgrimId } = await params;
    const session = await getSession();
    const tenantId = session?.session.activeOrganizationId;
    if (!tenantId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES + 64 * 1024) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const form = await request.formData();
    const type = String(form.get("type") ?? "");
    const file = form.get("file");
    if (!documentType(type)) return Response.json({ error: "UNKNOWN_DOCUMENT" }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = sniffImageOrPdf(bytes);
    if (!contentType) return Response.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });

    const caller = await api();
    await caller.pilgrims.get({ id: pilgrimId }); // tenant access check before anything is stored
    const key = `tenants/${tenantId}/pilgrims/${pilgrimId}/${type}-${randomUUID()}.${EXT[contentType]}.enc`;
    await putObject(key, encryptBytes(bytes), "application/octet-stream");
    const row = await caller.documents.attach({ pilgrimId, type, key, contentType, sizeBytes: bytes.length });
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error, "upload");
  }
}
