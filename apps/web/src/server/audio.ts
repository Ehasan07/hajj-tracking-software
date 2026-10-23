import "server-only";

/**
 * Audio for the guide book, answered whole or in the pieces phones ask for
 * (Safari won't play without range requests).
 */
export function audioResponse(request: Request, bytes: Uint8Array, contentType: string, cacheControl: string): Response {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = bytes.length;
    const start = Math.max(0, range[1] ? Number(range[1]) : size - Number(range[2]));
    const end = Math.min(range[1] && range[2] ? Number(range[2]) : size - 1, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(bytes.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}

/** What kind of audio a file really is, from its first bytes; the name and the browser's word aren't trusted. */
export function sniffAudio(b: Uint8Array): { type: "audio/mpeg" | "audio/mp4" | "audio/ogg" | "audio/wav" | "audio/webm"; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 3) === "ID3" || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0)) return { type: "audio/mpeg", ext: "mp3" };
  if (ascii(4, 8) === "ftyp") return { type: "audio/mp4", ext: "m4a" };
  if (ascii(0, 4) === "OggS") return { type: "audio/ogg", ext: "ogg" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return { type: "audio/wav", ext: "wav" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { type: "audio/webm", ext: "webm" };
  return null;
}
