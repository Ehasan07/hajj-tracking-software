import { expect, printed, test } from "./fixtures";

test("the guide book reads in Bangla and English, with search and reading settings", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("হজ, ওমরা ও নামাজের গাইড বই");
  for (const chapter of ["কুরআনের সূরা ও আয়াত", "কালিমা ও দরুদ শরিফ", "নামাজ", "দৈনন্দিন দোয়া", "ওমরা", "হজ", "মদিনা জিয়ারত"]) {
    await expect(page.getByRole("heading", { level: 2, name: chapter })).toBeVisible();
  }

  // Every surah ayah by ayah, and the words of the prayer with their source.
  const falaq = page.locator("#item-surah_falaq");
  await expect(falaq.getByText("কুল আ'ঊযু বিরাব্বিল ফালাক।")).toBeVisible();
  await expect(falaq.getByText("Say: I seek refuge with the Lord of daybreak")).toBeVisible();
  const tashahhud = page.locator("#item-dua_tashahhud").first();
  await expect(tashahhud.getByText("সহিহ বুখারি ১২০২")).toBeVisible();
  // Compared without diacritics: the page shows the source's own vowel marks.
  const arabic = (await tashahhud.locator("p[lang=ar]").first().innerText()).replace(/[\u064B-\u0652\u0670]/g, "");
  expect(arabic.startsWith("التحيات لله")).toBe(true);
  await expect(page.getByRole("heading", { name: "নামাজের ওয়াজিব: ১৪টি" })).toBeVisible();

  // Search narrows the book; reading settings hide a language.
  await page.getByPlaceholder(/খুঁজুন/).fill("জমজম");
  await expect(page.getByRole("status")).toContainText("পাওয়া গেছে");
  await expect(page.locator("#item-surah_falaq")).toBeHidden();
  // Either spelling finds the salawat; the kalimah shows both Quranic halves with their source.
  await page.getByPlaceholder(/খুঁজুন/).fill("দুরুদ");
  await expect(page.locator("#item-durud_virtue")).toBeVisible();
  await expect(page.locator("#item-dua_durud").first()).toBeVisible();
  await page.getByPlaceholder(/খুঁজুন/).fill("কলেমা");
  const kalima = page.locator("#item-kalima_tayyibah");
  await expect(kalima).toBeVisible();
  await expect(kalima.getByText("কুরআন ৪৭:১৯ ও ৪৮:২৯")).toBeVisible();
  await expect(kalima.getByText("সূরা আল-ফাতহ ৪৮:২৯", { exact: true })).toBeVisible();
  await expect(page.locator("#item-kalima_tamjid").getByText("সুনানে ইবনে মাজাহ ৩৮৭৮")).toBeVisible();
  await page.getByPlaceholder(/খুঁজুন/).fill("");
  await page.getByRole("button", { name: "English", pressed: true }).click();
  await expect(falaq.getByText("Say: I seek refuge with the Lord of daybreak")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: "English", pressed: false })).toBeVisible();

  // On paper: the whole book on A4, text showing (not hidden by the receipt-only print rules), no buttons.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#item-kalima_tayyibah")).toBeVisible();
  await expect(page.locator("#item-surah_falaq")).toBeVisible();
  await expect(page.getByRole("button", { name: "প্রিন্ট" })).toBeHidden();
  const sheets = await printed(page);
  expect(sheets).toMatchObject({ width: 595, height: 842 });
  expect(sheets.sheets).toBeGreaterThan(20);
  await page.emulateMedia({ media: "screen" });

  await page.goto("/en/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A guide to Hajj, Umrah and prayer");
});
