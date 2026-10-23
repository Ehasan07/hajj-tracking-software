import { eq } from "drizzle-orm";
import { db } from "@hajj/db";
import { guideRecordings } from "@hajj/db/schema";
import { describeError } from "@hajj/api/errors";
import { audioResponse } from "@/server/audio";
import { getObject } from "@/server/storage";

/** A guide item's recording (a dua, the kalimah…), for anyone; ?v= changes with each upload. */
export async function GET(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const [row] = await db.select().from(guideRecordings).where(eq(guideRecordings.itemId, itemId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  try {
    const { body } = await getObject(row.fileKey);
    return audioResponse(request, body, row.contentType, "public, max-age=3600");
  } catch (error) {
    console.warn(`[recording] ${itemId} ${describeError(error)}`);
    return new Response("Recording unavailable", { status: 502 });
  }
}
