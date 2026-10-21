import { expect, mobileNumber, passEmailStep, passPhoneStep, test } from "./fixtures";

test("the privacy policy is public in both languages and linked where data is collected", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "গোপনীয়তা নীতি" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /কতদিন রাখা হয়/ })).toBeVisible();
  await expect(page.getByText(/ব্যাকআপ ১৪ দিন রাখা হয়/)).toBeVisible();

  await page.getByRole("link", { name: "EN" }).click();
  await page.waitForURL(/\/en\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();

  await page.goto("/sign-up");
  await page.getByRole("link", { name: "গোপনীয়তা নীতি" }).click();
  await page.waitForURL(/\/privacy$/);
});

test("an owner erases a pilgrim's details on request; the money record stays", async ({ page }) => {
  const stamp = Date.now();
  const email = `erase-${stamp}@example.com`;
  const phone = mobileNumber();
  await page.goto("/sign-up");
  await page.locator("#name").fill("Habib Rahman");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("Correct-Horse-Battery-7");
  await page.locator("#phone").fill(phone);
  const since = new Date();
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await passEmailStep(page, email, since);
  await passPhoneStep(page, phone, since);
  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Barakah Travels");
  await page.locator("#prefix").fill("BT");
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);

  await page.goto("/app/packages");
  await page.locator("#name").fill("ওমরাহ");
  await page.locator("#season").fill("১৪৪৮");
  await page.locator("#price").fill("1,20,000");
  await page.getByRole("button", { name: "প্যাকেজ যোগ করুন" }).click();
  await expect(page.getByText("৳১,২০,০০০")).toBeVisible();

  await page.goto("/app/pilgrims/new");
  await page.locator("#fullName").fill("Salma Begum");
  await page.locator("#phone").fill("01799887766");
  await page.locator("#packageId").selectOption({ index: 1 });
  await page.getByRole("button", { name: "হাজী নিবন্ধন করুন" }).click();
  await page.waitForURL(/pilgrims\/[0-9a-f-]{36}$/);
  await page.locator("#amount").fill("20,000");
  await page.getByRole("button", { name: "টাকা গ্রহণ ও রসিদ তৈরি" }).click();
  await expect(page.getByText(/রসিদ MR-26-000001 তৈরি হয়েছে/)).toBeVisible();

  await page.getByRole("button", { name: "তথ্য মুছে ফেলুন" }).click();
  await page.getByLabel(/নিশ্চিত করতে রেফারেন্স লিখুন/).fill("BT-26-000001");
  await page.getByRole("button", { name: "স্থায়ীভাবে মুছুন" }).click();
  await expect(page.getByText(/ব্যক্তিগত তথ্য .* তাঁর অনুরোধে মুছে ফেলা হয়েছে/)).toBeVisible();
  await expect(page.getByText("Salma Begum")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "MR-26-000001" })).toBeVisible();

  await page.goto("/app/pilgrims");
  await expect(page.getByText("Salma Begum")).toHaveCount(0);
});
