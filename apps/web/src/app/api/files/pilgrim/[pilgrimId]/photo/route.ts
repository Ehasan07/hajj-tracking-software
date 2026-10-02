import { decryptBytes } from "@hajj/api/crypto";
import { getObject } from "@/server/storage";
import { api } from "@/trpc/server";
import { fail, fileResponse } from "../../../_shared";

export async function GET(_request: Request, { params }: { params: Promise<{ pilgrimId: string }> }) {
  try {
    const { pilgrimId } = await params;
    const photo = await (await api()).documents.photo({ pilgrimId });
    if (!photo) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    const { body } = await getObject(photo.key);
    return fileResponse(decryptBytes(body), photo.contentType);
  } catch (error) {
    return fail(error, "photo");
  }
}
