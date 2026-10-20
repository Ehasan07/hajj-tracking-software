import { expect, test } from "./fixtures";

test("the app installs, keeps the guide book for offline use, and never keeps private pages", async ({ page, context }) => {
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ short_name: "হজ ট্র্যাকিং", start_url: "/start?source=app", display: "standalone" });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

  await page.goto("/start");
  await expect(page.getByRole("link", { name: /গাইড বই/ }).first()).toBeVisible();
  // The worker installs and stores the public pages.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() => page.evaluate(async () => Boolean(await (await caches.open("hajj-v2")).match("/guide"))), { timeout: 20_000 })
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("হজ, ওমরা ও নামাজের গাইড বই");
  await expect(page.locator("#item-surah_falaq")).toBeVisible();
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "ইন্টারনেট নেই" })).toBeVisible();
  await context.setOffline(false);

  const kept = await page.evaluate(async () => (await (await caches.open("hajj-v2")).keys()).map((r) => new URL(r.url).pathname));
  expect(kept.filter((p) => /^\/(en\/)?(app|admin|api|sign-in|onboarding)/.test(p))).toEqual([]);
});

test("a phone set to English opens the Bangla link in Bangla, from the app's offline copy too", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" } });
  const page = await context.newPage();
  await page.goto("/guide");
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("হজ, ওমরা ও নামাজের গাইড বই");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() => page.evaluate(async () => Boolean(await (await caches.open("hajj-v2")).match("/guide"))), { timeout: 20_000 })
    .toBe(true);
  const redirected = await page.evaluate(async () => {
    const cache = await caches.open("hajj-v2");
    return (await Promise.all((await cache.keys()).map(async (r) => ((await cache.match(r))?.redirected ? new URL(r.url).pathname : null)))).filter(Boolean);
  });
  expect(redirected).toEqual([]);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("হজ, ওমরা ও নামাজের গাইড বই");
  await context.setOffline(true);
  await page.goto("/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("হজ, ওমরা ও নামাজের গাইড বই");
  await context.close();
});
