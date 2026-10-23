import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { expect, test } from "./fixtures";
import { waitForCode } from "./mail";

const PASSWORD = "Correct-Horse-Battery-7";

test("the platform owner uploads a qari's recording of a dua, and the guide plays it", async ({ page, baseURL }) => {
  // Making a platform admin takes the database owner, as on a real server (packages/db/src/platform-admin.ts).
  if (!process.env.DATABASE_OWNER_URL && existsSync(".env")) process.loadEnvFile(".env");
  const postgres = createRequire(path.join(process.cwd(), "packages/db/package.json"))("postgres") as typeof import("postgres");
  const sql = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  const headers = { origin: new URL(baseURL!).origin };
  const email = `qari-${Date.now()}@example.com`;
  // Start from a dua with no recording, whatever an earlier run left.
  await sql`delete from guide_recordings where item_id = 'dua_sana'`;
  try {
    const since = new Date();
    await page.request.post("/api/auth/sign-up/email", { headers, data: { name: "Platform Owner", email, password: PASSWORD } });
    expect((await page.request.post("/api/device/verify", { headers, data: { code: await waitForCode(email, since) } })).ok()).toBe(true);
    expect((await page.request.post("/api/auth/sign-in/email", { headers, data: { email, password: PASSWORD } })).ok()).toBe(true);
    await sql`insert into platform_admins (user_id) select id from "user" where email = ${email}`;

    // Any real audio will do for the test: one ayah's recitation.
    const audio = await (await page.request.get("/api/recitation/husary/1-1")).body();

    await page.goto("/admin/recordings");
    await expect(page.getByRole("heading", { name: "দোয়ার তিলাওয়াত", level: 1 })).toBeVisible();
    const form = page.locator("form").filter({ has: page.locator("#reciter-dua_sana") });
    await form.locator("#reciter-dua_sana").fill("Qari Test");
    await form.locator("input[type=file]").setInputFiles({ name: "sana.mp3", mimeType: "audio/mpeg", buffer: audio });
    await form.getByRole("button", { name: "আপলোড" }).click();
    await expect(page.locator('audio[src^="/api/recording/dua_sana"]')).toBeVisible();

    // A file that isn't audio is refused, whatever its name says.
    const fake = await page.request.post("/api/admin/recordings/dua_sana", {
      headers,
      multipart: { reciter: "Qari Test", file: { name: "sana.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("<html>not audio</html>") } },
    });
    expect(fake.status()).toBe(415);

    await page.goto("/guide");
    const sana = page.locator("#item-dua_sana").first();
    const play = sana.getByRole("button", { name: "তিলাওয়াত শুনুন" });
    await expect(play).toBeVisible();
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/recording/dua_sana")), play.click()]);
    expect(res.headers()["content-type"]).toBe("audio/mpeg");
    await expect(sana.locator('[data-verse="dua_sana|rec:dua_sana"]')).toHaveAttribute("data-playing", "");
    await expect(page.getByRole("status").filter({ hasText: "Qari Test" })).toBeVisible();
    await page.getByRole("button", { name: "থামান" }).click();

    // Duas without a recording show no play button.
    await expect(page.locator("#item-dua_masura").first().getByRole("button", { name: "তিলাওয়াত শুনুন" })).toHaveCount(0);
  } finally {
    await page.request.delete("/api/admin/recordings/dua_sana", { headers }).catch(() => undefined);
    await sql`delete from platform_admins where user_id in (select id from "user" where email = ${email})`;
    await sql.end();
  }
});
