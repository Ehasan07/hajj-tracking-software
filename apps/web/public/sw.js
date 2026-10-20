/*
 * Offline support for the installed app.
 *
 * What is kept on the phone: the public pages anyone may read (the guide
 * book, the app's home page, the offline page) and the static files they
 * need (scripts, styles, fonts, icons). What is never kept: anything behind
 * sign-in (pilgrims, payments, the books) and every API answer, so a shared
 * or lost phone holds no agency data.
 *
 * Public pages are served from the phone at once and refreshed in the
 * background; everything else goes to the network, with the offline page
 * when there is none.
 */

const VERSION = "hajj-v1";
const PAGES = ["/start", "/guide", "/en/start", "/en/guide", "/offline", "/en/offline"];
const PUBLIC_PAGE = /^\/(en\/)?(start|guide|offline)?\/?$/;
const PRIVATE = /^\/(en\/)?(app|admin|onboarding|sign-in|sign-up|forgot-password|dev)(\/|$)|^\/api\//;

/** Every hashed asset a page needs, read from its HTML, so the page works offline on first install. */
async function assetsOf(html) {
  const found = new Set();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) found.add(m[0]);
  return [...found];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
      for (const page of PAGES) {
        try {
          const res = await fetch(page, { credentials: "omit" });
          if (!res.ok) continue;
          await cache.put(page, res.clone());
          const assets = await assetsOf(await res.text());
          await Promise.allSettled(assets.map((a) => cache.add(a)));
        } catch {
          // Offline during install: the page will be cached the first time it is opened.
        }
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function offline(request) {
  const cache = await caches.open(VERSION);
  const english = new URL(request.url).pathname.startsWith("/en");
  return (await cache.match(english ? "/en/offline" : "/offline")) ?? new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Signed-in pages and the API: network only, never stored.
  if (PRIVATE.test(url.pathname)) {
    if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => offline(request)));
    return;
  }

  // Hashed build files, fonts and icons never change under the same name: phone first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })(),
    );
    return;
  }

  // The public pages: from the phone at once, refreshed in the background. Data requests
  // for in-app navigation (?_rsc=…) go to the network.
  if (request.mode === "navigate" && PUBLIC_PAGE.test(url.pathname) && !url.searchParams.has("_rsc")) {
    const key = url.pathname.replace(/\/$/, "") || "/";
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match(key);
        const refresh = fetch(request)
          .then(async (res) => {
            if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
              await cache.put(key, res.clone());
              const assets = await assetsOf(await res.clone().text());
              await Promise.allSettled(assets.map((a) => cache.match(a).then((hit) => hit ?? cache.add(a))));
            }
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(refresh);
          return cached;
        }
        return (await refresh) ?? offline(request);
      })(),
    );
    return;
  }

  // Any other page (agency websites, receipt checks): the network, or the offline page.
  if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => offline(request)));
});
