import { expect, test } from "@playwright/test";

// ICAO 9303 specimen passport, with valid check digits.
const MRZ = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10";
const shots = process.env.E2E_SCREENSHOTS;

async function snap(page: import("@playwright/test").Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test("office day: inquiry to printed receipt", async ({ page }) => {
  const email = `owner-${Date.now()}@example.com`;

  await page.goto("/sign-up");
  await page.locator("#name").fill("Rahim Uddin");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();

  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Al Madina Travels");
  await page.locator("#licenseNumber").fill("RL-1234");
  await page.locator("#prefix").fill("AM");
  await page.getByLabel("জমজম পানি").check();
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("আসসালামু আলাইকুম");

  await page.goto("/app/packages");
  await page.locator("#name").fill("প্রিমিয়াম হজ");
  await page.locator("#season").fill("১৪৪৮");
  await page.locator("#price").fill("6,50,000");
  await page.locator("#days").fill("40");
  await page.getByRole("button", { name: "প্যাকেজ যোগ করুন" }).click();
  await expect(page.getByText("৳৬,৫০,০০০")).toBeVisible();
  await snap(page, "01-packages");

  await page.goto("/app/inquiries");
  await page.locator("#iq-name").fill("আব্দুল করিম");
  await page.locator("#iq-phone").fill("01712-345678");
  await page.locator("#iq-notes").fill("পরিবারের ৩ জন, প্রিমিয়াম প্যাকেজে আগ্রহী");
  await page.getByRole("button", { name: "জিজ্ঞাসা সংরক্ষণ" }).click();
  await expect(page.getByText("IQ-26-000001")).toBeVisible();
  await snap(page, "02-inquiries");

  await page.getByRole("link", { name: "হাজী হিসেবে নিবন্ধন" }).click();
  await page.waitForURL(/pilgrims\/new\?inquiry=/);
  await expect(page.locator("#fullName")).toHaveValue("আব্দুল করিম");
  await page.locator("#mrz").fill(MRZ);
  await expect(page.getByText("পাসপোর্ট পড়া হয়েছে")).toBeVisible();
  await expect(page.locator("#passportNumber")).toHaveValue("L898902C3");
  await page.locator("#fullName").fill("Md. Abdul Karim");
  await page.locator("#packageId").selectOption({ index: 1 });
  await page.locator("#discount").fill("10000");
  await snap(page, "03-new-pilgrim");
  await page.getByRole("button", { name: "হাজী নিবন্ধন করুন" }).click();

  await page.waitForURL(/pilgrims\/[0-9a-f-]{36}$/);
  await expect(page.getByText("AM-26-000001")).toBeVisible();
  await expect(page.getByText("L8•••••C3")).toBeVisible();

  await page.locator("#amount").fill("2,00,000");
  await page.getByRole("button", { name: "টাকা গ্রহণ ও রসিদ তৈরি" }).click();
  await expect(page.getByText("রসিদ MR-26-000001 তৈরি হয়েছে")).toBeVisible();

  await page.locator("#amount").fill("500000");
  await page.getByRole("button", { name: "টাকা গ্রহণ ও রসিদ তৈরি" }).click();
  await expect(page.getByText("বকেয়ার চেয়ে বেশি")).toBeVisible();

  await page.locator("#amount").fill("50000");
  await page.getByText("bKash", { exact: true }).click();
  await page.locator("#reference").fill("9F7K2LQ8XZ");
  await page.getByRole("button", { name: "টাকা গ্রহণ ও রসিদ তৈরি" }).click();
  await expect(page.getByText("রসিদ MR-26-000002 তৈরি হয়েছে")).toBeVisible();
  await expect(page.getByText("৳৩,৯০,০০০").first()).toBeVisible();
  await snap(page, "04-pilgrim");

  // Papers: upload a photo, verify it, and see that the pilgrim still can't be finalised without the rest.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  await expect(page.getByText("চূড়ান্ত করার প্রস্তুতি")).toBeVisible();
  await page.getByLabel("সাম্প্রতিক ছবি: আপলোড").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("জমা হয়েছে, যাচাই বাকি").first()).toBeVisible();
  await page.getByRole("button", { name: "যাচাই ঠিক আছে" }).first().click();
  await expect(page.locator("img[alt='Md. Abdul Karim']")).toBeVisible();
  await page.locator("#status").selectOption("ready");
  await expect(page.getByText("সব শর্ত পূরণ না হওয়ায়")).toBeVisible();

  await page.getByRole("link", { name: "রসিদ দেখুন" }).click();
  await page.waitForURL(/receipts\//);
  await expect(page.getByText("পঞ্চাশ হাজার টাকা মাত্র")).toBeVisible();
  await expect(page.getByText("Fifty Thousand Taka Only", { exact: false })).toBeVisible();
  await page.waitForTimeout(1200);
  await snap(page, "05-receipt");

  const qrLink = await page.evaluate(() => document.querySelector("article svg path") !== null);
  expect(qrLink).toBe(true);

  await page.goto("/app");
  await page.waitForTimeout(1600);
  await expect(page.getByText("৳২,৫০,০০০").first()).toBeVisible();
  await snap(page, "06-dashboard");

  // Religious content: Arabic is shown, the meaning is a draft until the agency approves it.
  await page.goto("/app/sacred?tab=duas");
  const talbiyah = page.locator("#dua_talbiyah");
  await expect(talbiyah.locator('[lang="ar"]')).toBeVisible();
  await expect(talbiyah.getByText("খসড়া · আলেমের যাচাই বাকি")).toBeVisible();
  await talbiyah.getByRole("button", { name: "যেমন আছে অনুমোদন" }).click();
  await expect(talbiyah.getByText("আলেম অনুমোদিত")).toBeVisible();
  await page.goto("/app/sacred");
  await expect(page.getByRole("heading", { name: "মিকাত থেকে ইহরাম" })).toBeVisible();

  await page.goto("/app/pilgrims?q=01712345678");
  await expect(page.getByText("AM-26-000001")).toBeVisible();
  await page.goto("/en/app/pilgrims?q=L898902C3");
  await expect(page.getByText("Md. Abdul Karim")).toBeVisible();
  await snap(page, "07-search-en");

  // The platform console does not exist for agency owners.
  const consoleRes = await page.goto("/admin");
  expect(consoleRes?.status()).toBe(404);

  // Signing out and back in lands on the same agency's dashboard, not onboarding.
  await page.goto("/en/app");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/sign-in/);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByText("Al Madina Travels").first()).toBeVisible();
});

test("receipt QR opens a public check page", async ({ page, request }) => {
  const res = await request.get("/verify/not-a-real-token-at-all-123");
  expect(res.status()).toBe(200);
  await page.goto("/verify/not-a-real-token-at-all-123");
  await expect(page.getByText("এই রসিদ আমাদের খাতায় পাওয়া যায়নি")).toBeVisible();
});
