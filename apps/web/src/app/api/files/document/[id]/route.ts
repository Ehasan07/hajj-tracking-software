import { decryptBytes } from "@hajj/api/crypto";
import { getObject } from "@/server/storage";
import { api } from "@/trpc/server";
import { fail, fileResponse } from "../../_shared";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await (await api()).documents.file({ id });
    const { body } = await getObject(doc.key);
    return fileResponse(decryptBytes(body), doc.contentType);
  } catch (error) {
    return fail(error, "document");
  }
}
