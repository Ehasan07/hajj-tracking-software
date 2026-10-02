import { expect, test } from "@playwright/test";

// Runs against the agency set by PUBLIC_TENANT_SLUG (the seeded demo agency locally and in CI).
test("public website: packages, sacred text and the inquiry form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#packages article").first()).toBeVisible();
  await expect(page.locator('[lang="ar"]').first()).toBeVisible();
  await expect(page.getByRole("img", { name: /কাবা/ })).toBeVisible();

  // "I'm interested" preselects the package in the form.
  await page.locator("#packages article").first().getByRole("link").click();
  await expect(page.locator("#site-package")).not.toHaveValue("");

  await page.locator("#site-name").fill("ওয়েবসাইট দর্শনার্থী");
  await page.locator("#site-phone").fill("0171234");
  await page.getByRole("button", { name: "পাঠিয়ে দিন" }).click();
  await expect(page.getByText("সঠিক মোবাইল নম্বর দিন")).toBeVisible();

  // The name typed before the error is still there.
  await expect(page.locator("#site-name")).toHaveValue("ওয়েবসাইট দর্শনার্থী");
  await page.locator("#site-phone").fill("01812-345678");
  await page.locator("#site-notes").fill("ডিসেম্বরে ওমরা করতে চাই");
  await page.getByRole("button", { name: "পাঠিয়ে দিন" }).click();
  await expect(page.getByText(/আপনার জিজ্ঞাসা নম্বর IQ-\d{2}-\d{6}/)).toBeVisible();
});

test("public website in English", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "See packages" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hajj and Umrah packages" })).toBeVisible();
});
