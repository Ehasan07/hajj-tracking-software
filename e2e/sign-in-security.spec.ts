import { clientAddress, expect, mobileNumber, passPhoneStep, test } from "./fixtures";
import { waitForCode, waitForMail } from "./mail";

const PASSWORD = "Correct-Horse-Battery-7";

async function signUp(page: import("@playwright/test").Page, email: string, phone = mobileNumber()) {
  await page.goto("/sign-up");
  await page.locator("#name").fill("Nadia Islam");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#phone").fill(phone);
  const since = new Date();
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await passPhoneStep(page, phone, since);
  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Noor Travels");
  await page.locator("#prefix").fill("NT");
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);
}

async function submitPassword(page: import("@playwright/test").Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "লগইন" }).click();
}

async function typeCode(page: import("@playwright/test").Page, code: string) {
  await page.getByRole("textbox", { name: "৬ সংখ্যার কোড 1" }).click();
  await page.keyboard.type(code);
}

test("a new device needs the emailed code once; then it is trusted and can be removed", async ({ page, browser }) => {
  const email = `nadia-${Date.now()}@example.com`;
  await signUp(page, email);
  // The browser the account was opened in is already trusted; forget everything to act as another one.
  await page.context().clearCookies();

  // New browser for this account: password alone is not enough.
  let since = new Date();
  await submitPassword(page, email);
  await expect(page.getByText("নতুন ডিভাইস থেকে লগইন")).toBeVisible();
  await expect(page.getByText(/na•+\d@example\.com/)).toBeVisible();

  await typeCode(page, "000000");
  await expect(page.getByText(/কোড মেলেনি। আর ৪ বার/)).toBeVisible();

  await typeCode(page, await waitForCode(email, since));
  await page.waitForURL(/\/app$/);
  await waitForMail(email, since, /New sign-in/);

  await page.goto("/app/devices");
  await expect(page.getByText("এই ডিভাইস")).toBeVisible();

  // Same browser again: straight in.
  await page.context().clearCookies({ name: "hajj.session_token" });
  await submitPassword(page, email);
  await page.waitForURL(/\/app$/);

  // A different browser is asked again.
  const other = await (await browser.newContext({ locale: "bn-BD", extraHTTPHeaders: { "x-real-ip": clientAddress() } })).newPage();
  await submitPassword(other, email);
  await expect(other.getByText("নতুন ডিভাইস থেকে লগইন")).toBeVisible();

  // Removing this device makes the next sign-in ask for a code.
  // (The other row is the browser the account was opened in, before its cookies were cleared.)
  await page.goto("/app/devices");
  await expect(page.getByRole("listitem").filter({ hasText: "সরিয়ে দিন" })).toHaveCount(2);
  await page.getByRole("listitem").filter({ hasText: "এই ডিভাইস" }).getByRole("button", { name: "সরিয়ে দিন" }).click();
  await page.getByRole("button", { name: "হ্যাঁ, সরান" }).click();
  await expect(page.getByText("এই ডিভাইস")).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "সরিয়ে দিন" })).toHaveCount(1);
  await page.context().clearCookies({ name: "hajj.session_token" });
  since = new Date();
  await submitPassword(page, email);
  await expect(page.getByText("নতুন ডিভাইস থেকে লগইন")).toBeVisible();
  await typeCode(page, await waitForCode(email, since));
  await page.waitForURL(/\/app$/);
});

test("password reset by emailed code signs straight in and other devices out", async ({ page, browser }) => {
  const email = `reset-${Date.now()}@example.com`;
  await signUp(page, email);

  const fresh = await (await browser.newContext({ locale: "bn-BD", extraHTTPHeaders: { "x-real-ip": clientAddress() } })).newPage();
  await fresh.goto("/sign-in");
  await fresh.getByRole("link", { name: "পাসওয়ার্ড ভুলে গেছেন?" }).click();
  await fresh.waitForURL(/forgot-password/);
  const since = new Date();
  await fresh.locator("#email").fill(email);
  await fresh.getByRole("button", { name: "কোড পাঠান" }).click();
  await expect(fresh.getByText("কোনো অ্যাকাউন্ট থাকলে")).toBeVisible();
  await typeCode(fresh, await waitForCode(email, since));
  await fresh.locator("#password").fill("Brand-New-Secret-42");
  await fresh.locator("#confirm").fill("Brand-New-Secret-42");
  await fresh.getByRole("button", { name: "পাসওয়ার্ড সেভ করে লগইন" }).click();
  await fresh.waitForURL(/\/app$/);
  await waitForMail(email, since, /password was changed/);

  // The first browser's session was ended by the reset.
  await page.goto("/app");
  await page.waitForURL(/sign-in/);
});

test("an unknown email gets the same answer, and five wrong passwords lock sign-in", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.locator("#email").fill(`nobody-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "কোড পাঠান" }).click();
  await expect(page.getByText("কোনো অ্যাকাউন্ট থাকলে")).toBeVisible();
  await typeCode(page, "123456");
  await expect(page.getByText("কোড মেলেনি। আবার চেষ্টা করুন।")).toBeVisible();

  const email = `locked-${Date.now()}@example.com`;
  for (let i = 0; i < 5; i++) {
    await submitPassword(page, email, `wrong-password-${i}`);
    await expect(page.getByRole("alert").first()).toBeVisible();
  }
  await submitPassword(page, email, "still-wrong-password");
  await expect(page.getByText(/১৫ মিনিট/)).toBeVisible();
});

test("sign-up shows the password rules, can reveal the password, and the server refuses a weak one", async ({ page, request }) => {
  const email = `rules-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.locator("#name").fill("Nadia Islam");
  await page.locator("#email").fill(email);
  await expect(page.getByText("পাসওয়ার্ডে যা থাকতে হবে")).toBeVisible();

  await page.locator("#phone").fill(mobileNumber());
  await page.locator("#password").fill("nadia12345");
  await expect(page.getByText("শক্তি: খুব দুর্বল")).toBeVisible();
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await expect(page.getByText("পাসওয়ার্ড এখনো সব শর্ত পূরণ করেনি")).toBeVisible();
  await expect(page).toHaveURL(/sign-up/);

  await page.getByRole("button", { name: "পাসওয়ার্ড দেখুন" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "পাসওয়ার্ড লুকান" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");

  await page.locator("#password").fill("Rx7#mangoTree!river");
  await expect(page.getByText("শক্তি: খুব শক্ত")).toBeVisible();

  // Skipping the form doesn't skip the rules.
  const res = await request.post("/api/auth/sign-up/email", {
    headers: { origin: new URL(page.url()).origin },
    data: { name: "Nadia Islam", email: `api-${email}`, password: "password1234" },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe("WEAK_PASSWORD");
});
