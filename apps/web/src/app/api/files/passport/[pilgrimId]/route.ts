import { randomUUID } from "node:crypto";
import { decryptBytes, encryptBytes } from "@hajj/api/crypto";
import { getSession } from "@/server/session";
import { getObject, putObject, sniffImageOrPdf, storageAdded } from "@/server/storage";
import { api } from "@/trpc/server";
import { fail, fileResponse, storeRefused, uploadRefused } from "../../_shared";

const MAX_BYTES = 8 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as const;

type Params = { params: Promise<{ pilgrimId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { pilgrimId } = await params;
    const session = await getSession();
    if (!session?.session.activeOrganizationId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const tenantId = session.session.activeOrganizationId;

    const refused = uploadRefused(request, session.user.id, MAX_BYTES) ?? (await storeRefused(tenantId, Number(request.headers.get("content-length"))));
    if (refused) return refused;

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
    const sealed = encryptBytes(bytes);
    await putObject(key, sealed, "application/octet-stream");
    storageAdded(tenantId, sealed.length);
    await caller.pilgrims.attachPassportScan({ id: pilgrimId, key });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error, "passport upload");
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
    return fileResponse(plain, sniffImageOrPdf(plain) ?? "application/octet-stream");
  } catch (error) {
    return fail(error, "passport");
  }
}
