import { ayahNumber, RECITERS } from "@hajj/sacred";
import { describeError } from "@hajj/api/errors";
import { clientIp, limitKey } from "@/server/client-ip";
import { allow } from "@/server/rate-limit";
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

  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // The same ayah by the same reciter never changes.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  // Phones (Safari above all) ask for the audio in pieces and won't play without them.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = bytes.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(bytes.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
