import { getSession } from "@/server/session";
import { isSiteImagePurpose, SITE_IMAGE_MAX_BYTES, siteImageUrl, SiteImageError, storeSiteImage } from "@/server/site-media";
import { api } from "@/trpc/server";
import { fail } from "../../files/_shared";

/**
 * Upload one website picture: form fields "purpose" (logo, hero, gallery,
 * post, package) and "file". Only the agency's owner or admin may. Returns the
 * storage key, which the page then saves where it belongs.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const tenantId = session?.session.activeOrganizationId;
    if (!tenantId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > SITE_IMAGE_MAX_BYTES + 64 * 1024) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const caller = await api();
    const me = await caller.tenant.me();
    if (me.role !== "owner" && me.role !== "admin") return Response.json({ error: "FORBIDDEN" }, { status: 403 });

    const form = await request.formData();
    const purpose = String(form.get("purpose") ?? "");
    const file = form.get("file");
    if (!isSiteImagePurpose(purpose)) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
    if (file.size > SITE_IMAGE_MAX_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

    const key = await storeSiteImage(me.tenantId, purpose, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ key, url: siteImageUrl(key) });
  } catch (error) {
    if (error instanceof SiteImageError) return Response.json({ error: error.message }, { status: 415 });
    return fail(error, "site upload");
  }
}
