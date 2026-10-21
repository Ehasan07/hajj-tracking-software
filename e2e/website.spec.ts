import { clientAddress, expect, mobileNumber, passEmailStep, passPhoneStep, test } from "./fixtures";

const shots = process.env.E2E_SCREENSHOTS;
async function snap(page: import("@playwright/test").Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

// A 64×48 PNG, enough for the server to decode and re-encode.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAfUlEQVRoge2SwQkAQRDC/KdY/1f9lRGGFVJAIoavp4luwAKqr8gu1LtEN2AB1VdkF+pdohuwgOorsgv1LtENWED1FdmFepfoBiyg+orsQr1LdAMWUH1FdqHeJboBC6i+IrtQ7xLdgAVUX5FdqHeJbsACqq/ILtS7RDfg8YAfFNZwpuakYHEAAAAASUVORK5CYII=",
  "base64",
);

test("an agency arranges its own website, and a visitor's review shows once approved", async ({ page, browser }) => {
  const stamp = Date.now();
  const slug = `noor-${stamp}`;
  page.on("dialog", (d) => void d.accept());

  await page.goto("/sign-up");
  await page.locator("#name").fill("Nadia Islam");
  await page.locator("#email").fill(`site-${stamp}@example.com`);
  await page.locator("#password").fill("Correct-Horse-Battery-7");
  const phone = mobileNumber();
  await page.locator("#phone").fill(phone);
  const since = new Date();
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await passEmailStep(page, `site-${stamp}@example.com`, since);
  await passPhoneStep(page, phone, since);
  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Noor Travels");
  await page.locator("#prefix").fill("NR");
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);

  // Address, colour, words, contact, logo.
  await page.getByRole("link", { name: "ওয়েবসাইট" }).first().click();
  await page.waitForURL(/\/app\/website/);
  await page.getByRole("button", { name: "ঠিকানা বদলান" }).click();
  await page.locator("#ws-slug").fill(slug);
  await page.getByRole("button", { name: "ঠিকানা সংরক্ষণ" }).click();
  await expect(page.getByText(`/site/${slug}`, { exact: false }).first()).toBeVisible();

  await page.getByText("রাতের আকাশ").click();
  await page.locator("#ws-tagline-bn").fill("বিশ্বস্ত হাতে আপনার হজ ও ওমরা");
  await page.locator("#ws-whatsapp").fill("01712-345678");
  await page.locator("#ws-phone").fill("01812345678");
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "সংরক্ষিত হয়েছে" })).toBeVisible();
  await page.getByLabel("লোগো").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "সরিয়ে দিন" }).first()).toBeVisible();
  await snap(page, "30-website-general");

  // A post and a question.
  await page.getByRole("link", { name: "পোস্ট ও নোটিশ" }).click();
  await page.getByRole("button", { name: "নতুন পোস্ট" }).click();
  await page.locator("#po-title-bn").fill("২০২৭ সালের হজের নিবন্ধন শুরু");
  await page.locator("#po-body-bn").fill("প্রাক-নিবন্ধনের শেষ তারিখ ৩০ নভেম্বর।\n\n- পাসপোর্ট\n- ছবি");
  await page.getByRole("button", { name: "পোস্ট সংরক্ষণ" }).click();
  await expect(page.getByText("প্রকাশিত")).toBeVisible();

  await page.getByRole("link", { name: "প্রশ্নোত্তর" }).click();
  await page.getByRole("button", { name: "নতুন প্রশ্ন" }).click();
  await page.locator("#fq-q-new").fill("হজে যেতে কী কী কাগজ লাগে?");
  await page.locator("#fq-a-new").fill("পাসপোর্ট, জাতীয় পরিচয়পত্র আর ছবি।");
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await expect(page.getByText("হজে যেতে কী কী কাগজ লাগে?")).toBeVisible();

  // The public site, as a stranger sees it.
  const visitor = await (await browser.newContext({ locale: "bn-BD", extraHTTPHeaders: { "x-real-ip": clientAddress() } })).newPage();
  await visitor.goto(`/site/${slug}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("বিশ্বস্ত হাতে আপনার হজ ও ওমরা");
  await expect(visitor.getByText("২০২৭ সালের হজের নিবন্ধন শুরু")).toBeVisible();
  await expect(visitor.getByText("হজে যেতে কী কী কাগজ লাগে?")).toBeVisible();
  const primary = await visitor.locator("div[style*='--color-haram']").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--color-haram").trim());
  expect(primary).toBe("#24508f");
  const logo = visitor.locator("header img").first();
  await expect(logo).toHaveAttribute("src", /\/api\/site\/media\//);
  expect((await visitor.request.get((await logo.getAttribute("src"))!)).status()).toBe(200);

  await visitor.getByText("২০২৭ সালের হজের নিবন্ধন শুরু").locator("xpath=ancestor::article").getByRole("link", { name: "পুরোটা পড়ুন" }).click();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("২০২৭ সালের হজের নিবন্ধন শুরু");
  await expect(visitor.getByText("পাসপোর্ট", { exact: true })).toBeVisible();
  await snap(visitor, "33-site-post");
  await visitor.goBack();

  // A review from the website waits for the agency.
  await visitor.getByText("আপনার অভিজ্ঞতা লিখুন").click();
  await visitor.locator("#rv-name").fill("Abdul Karim");
  await visitor.locator("#rv-body").fill("আলহামদুলিল্লাহ, পুরো যাত্রায় খুব যত্ন পেয়েছি।");
  await visitor.getByRole("button", { name: "মতামত পাঠান" }).click();
  await expect(visitor.getByText("ধন্যবাদ! এজেন্সি দেখে নেওয়ার পর")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("পুরো যাত্রায় খুব যত্ন পেয়েছি")).toHaveCount(0);

  await page.goto("/app/website?tab=reviews");
  await expect(page.getByText("পুরো যাত্রায় খুব যত্ন পেয়েছি")).toBeVisible();
  await snap(page, "31-website-reviews");
  await page.getByRole("button", { name: "প্রকাশ করুন" }).click();
  await expect(page.getByRole("tab", { name: /প্রকাশিত \(1\)/ })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("পুরো যাত্রায় খুব যত্ন পেয়েছি")).toBeVisible();
  await snap(visitor, "32-site");
  if (shots) {
    await visitor.setViewportSize({ width: 390, height: 900 });
    await snap(visitor, "34-site-mobile");
  }

  // Switched off: strangers get "not found", the owner gets a preview.
  await page.goto("/app/website");
  await page.getByRole("switch", { name: "ওয়েবসাইট চালু" }).click();
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "সংরক্ষিত হয়েছে" })).toBeVisible();
  expect((await visitor.goto(`/site/${slug}`))?.status()).toBe(404);
  await page.goto(`/site/${slug}`);
  await expect(page.getByText("এই ওয়েবসাইট এখন বন্ধ আছে")).toBeVisible();
});
