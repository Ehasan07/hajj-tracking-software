import { ayahNumber, RECITERS } from "@hajj/sacred";
import { describeError } from "@hajj/api/errors";
import { clientIp, limitKey } from "@/server/client-ip";
import { allow } from "@/server/rate-limit";
import { audioResponse } from "@/server/audio";
import { getObject, putObject } from "@/server/storage";

/**
 * The recitation of one ayah of the guide book, e.g. /api/recitation/husary/112-1.
 *
 * The first time an ayah is asked for, it is fetched from Islamic Network's
 * audio CDN (which allows this for educational use and asks apps to cache)
 * and kept in our storage; after that it is served from here. Only the ayat
 * the guide book holds are available, so this is not a way to download the
 * whole Quran. Visitors' browsers only ever talk to this site.
 */

const CDN = (edition: string, n: number) => `https://cdn.islamic.network/quran/audio/128/${edition}/${n}.mp3`;
const MAX_BYTES = 5 * 1024 * 1024;

async function audioFor(edition: string, n: number): Promise<Uint8Array> {
  const key = `recitations/${edition}/128/${n}.mp3`;
  try {
    return (await getObject(key)).body;
  } catch {
    // Not kept yet.
  }
  const res = await fetch(CDN(edition, n), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) throw new Error(`recitation source answered ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error("recitation source sent an unexpected file");
  await putObject(key, bytes, "audio/mpeg");
  return bytes;
}

export async function GET(request: Request, { params }: { params: Promise<{ reciter: string; ref: string }> }) {
  const { reciter, ref } = await params;
  const who = RECITERS.find((r) => r.id === reciter);
  const m = /^(\d{1,3})-(\d{1,3})$/.exec(ref);
  const n = m ? ayahNumber(`${Number(m[1])}:${Number(m[2])}`) : null;
  if (!who || !n) return new Response("Not found", { status: 404 });
  if (!allow(`recite:${limitKey(clientIp(request.headers))}`, 600, 10 * 60_000)) return new Response("Too many requests", { status: 429 });

  let bytes: Uint8Array;
  try {
    bytes = await audioFor(who.edition, n);
  } catch (error) {
    console.warn(`[recitation] ${who.id} ${ref} ${describeError(error)}`);
    return new Response("Recitation unavailable", { status: 502 });
  }

  // The same ayah by the same reciter never changes.
  return audioResponse(request, bytes, "audio/mpeg", "public, max-age=31536000, immutable");
}
