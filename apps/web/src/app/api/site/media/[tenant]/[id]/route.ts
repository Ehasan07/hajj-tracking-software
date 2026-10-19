import { readSiteImage } from "@/server/site-media";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TENANT = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * A picture from an agency's website. Public by design, but only while the
 * site still uses it: a removed photo stops being served (browsers may keep
 * their copy for up to a day).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  if (!TENANT.test(tenant) || !UUID.test(id)) return new Response(null, { status: 404 });
  const bytes = await readSiteImage(tenant, id);
  if (!bytes) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
