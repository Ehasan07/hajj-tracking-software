import { desc } from "drizzle-orm";
import { db } from "@hajj/db";
import { guideRecordings } from "@hajj/db/schema";

/**
 * Which guide items have a qari's recording, for the public guide's player:
 * { itemId: { reciter, url } }. The url changes with each new upload.
 */
export async function GET() {
  const rows = await db
    .select({ itemId: guideRecordings.itemId, reciter: guideRecordings.reciter, uploadedAt: guideRecordings.uploadedAt })
    .from(guideRecordings)
    .orderBy(desc(guideRecordings.uploadedAt));
  const list = Object.fromEntries(
    rows.map((r) => [r.itemId, { reciter: r.reciter, url: `/api/recording/${r.itemId}?v=${r.uploadedAt.getTime()}` }]),
  );
  return Response.json(list, { headers: { "Cache-Control": "public, max-age=60" } });
}
