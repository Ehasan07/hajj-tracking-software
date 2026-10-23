import { randomUUID } from "node:crypto";
import { RECORDING_MAX_BYTES } from "@hajj/api/routers/platform";
import { getSession } from "@/server/session";
import { sniffAudio } from "@/server/audio";
import { deleteObjects, putObject } from "@/server/storage";
import { api } from "@/trpc/server";
import { fail, uploadRefused } from "../../../files/_shared";

/**
 * Upload (POST: form fields "file" and "reciter") or remove (DELETE) a guide
 * item's recording. Platform admins only: the check runs before anything is
 * stored, and again in the database when the recording is saved.
 */
export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const session = await getSession();
    if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const refused = uploadRefused(request, session.user.id, RECORDING_MAX_BYTES);
    if (refused) return refused;
    const caller = await api();
    await caller.platform.recordings(); // platform admins only

    const form = await request.formData();
    const file = form.get("file");
    const reciter = String(form.get("reciter") ?? "").trim();
    if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
    if (file.size > RECORDING_MAX_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffAudio(bytes);
    if (!kind) return Response.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });

    const key = `guide-recordings/${itemId}-${randomUUID()}.${kind.ext}`;
    await putObject(key, bytes, kind.type);
    try {
      const { previousKey } = await caller.platform.setRecording({ itemId, reciter, key, contentType: kind.type, sizeBytes: bytes.length });
      if (previousKey) await deleteObjects([previousKey]).catch(() => undefined);
    } catch (error) {
      await deleteObjects([key]).catch(() => undefined);
      throw error;
    }
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error, "recording upload");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const { removedKey } = await (await api()).platform.removeRecording({ itemId });
    if (removedKey) await deleteObjects([removedKey]).catch(() => undefined);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error, "recording remove");
  }
}
