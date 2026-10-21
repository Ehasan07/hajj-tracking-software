import { clientAddress, expect, mobileNumber, passEmailStep, passPhoneStep, test } from "./fixtures";
import { waitForSms, waitForSmsCode } from "./mail";

const PASSWORD = "Correct-Horse-Battery-7";
const shots = process.env.E2E_SCREENSHOTS;
async function snap(page: import("@playwright/test").Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test("the mobile is verified at sign-up, and a forgotten password comes back by SMS", async ({ page, browser }) => {
  const stamp = Date.now();
  const email = `mobile-${stamp}@example.com`;
  const phone = mobileNumber();

  await page.goto("/sign-up");
  await page.locator("#name").fill("Selim Reza");
  await page.locator("#email").fill(email);
  await page.locator("#phone").fill("12345");
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await expect(page.getByText("বাংলাদেশের মোবাইল নম্বর দিন")).toBeVisible();

  await page.locator("#phone").fill(phone);
  let since = new Date();
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await passEmailStep(page, email, since);
  await expect(page.getByText("মোবাইল নম্বর যাচাই")).toBeVisible();
  await page.getByRole("textbox", { name: "৬ সংখ্যার কোড 1" }).click();
  await page.keyboard.type("000000");
  await expect(page.getByText(/কোড মেলেনি। আর ৪ বার/)).toBeVisible();
  await passPhoneStep(page, phone, since);
  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Reza Travels");
  await page.locator("#prefix").fill("RZ");
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);

  await page.goto("/app/devices");
  await expect(page.getByText(`যাচাই করা মোবাইল: ${phone.slice(0, 5)}-•••${phone.slice(-3)}`)).toBeVisible();
  await snap(page, "40-devices-phone");
  await page.getByRole("link", { name: "SMS ও নোটিশ" }).click();
  await expect(page.getByRole("heading", { name: "হাজীদের নোটিশ পাঠান" })).toBeVisible();
  await expect(page.getByText("০টা নম্বরে যাবে")).toBeVisible();
  await page.getByRole("button", { name: "ফ্লাইটের খবর" }).click();
  await expect(page.locator("#sms-text")).toHaveValue(/ফ্লাইট/);
  await snap(page, "41-sms");

  // Another browser, password forgotten: the code goes to the mobile.
  const fresh = await (await browser.newContext({ locale: "bn-BD", extraHTTPHeaders: { "x-real-ip": clientAddress() } })).newPage();
  await fresh.goto("/forgot-password");
  await fresh.getByRole("tab", { name: "মোবাইলে SMS" }).click();
  await fresh.locator("#rp-phone").fill(phone);
  since = new Date();
  await fresh.getByRole("button", { name: "কোড পাঠান" }).click();
  await expect(fresh.getByText("নম্বরে কোনো অ্যাকাউন্ট থাকলে")).toBeVisible();
  await fresh.getByRole("textbox", { name: "৬ সংখ্যার কোড 1" }).click();
  await fresh.keyboard.type(await waitForSmsCode(phone, since));
  await fresh.locator("#rp-password").fill("Brand-New-Secret-42");
  await fresh.locator("#rp-confirm").fill("Brand-New-Secret-42");
  await fresh.getByRole("button", { name: "পাসওয়ার্ড সেভ করে লগইন" }).click();
  await fresh.waitForURL(/\/app$/);

  // The first browser was signed out by the reset.
  await page.goto("/app");
  await page.waitForURL(/sign-in/);
});

test("a number with no account gets the same answer and no SMS", async ({ page }) => {
  const phone = mobileNumber();
  const since = new Date();
  await page.goto("/forgot-password");
  await page.getByRole("tab", { name: "মোবাইলে SMS" }).click();
  await page.locator("#rp-phone").fill(phone);
  await page.getByRole("button", { name: "কোড পাঠান" }).click();
  await expect(page.getByText("নম্বরে কোনো অ্যাকাউন্ট থাকলে")).toBeVisible();
  await page.getByRole("textbox", { name: "৬ সংখ্যার কোড 1" }).click();
  await page.keyboard.type("123456");
  await expect(page.getByText(/কোড মেলেনি/)).toBeVisible();
  await expect(waitForSms(phone, since, /./, 2_500)).rejects.toThrow(/no SMS/);
});
