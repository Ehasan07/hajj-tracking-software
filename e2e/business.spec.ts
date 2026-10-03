import { expect, test } from "@playwright/test";

const shots = process.env.E2E_SCREENSHOTS;
async function snap(page: import("@playwright/test").Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

/** Route number (Saturday = 1) of today's date in Dhaka. */
function todaysRoute() {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "short" }).format(new Date());
  return ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(day) + 1;
}

test("side businesses: zamzam route on credit, statements, and a medicine-only login", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/sign-up");
  await page.locator("#name").fill("Karim Mia");
  await page.locator("#email").fill(`shops-${stamp}@example.com`);
  await page.locator("#password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "অ্যাকাউন্ট খুলুন" }).click();
  await page.waitForURL("**/onboarding");
  await page.locator("#agencyName").fill("Safa Travels");
  await page.locator("#prefix").fill("SF");
  await page.getByLabel("জমজম পানি").check();
  await page.getByLabel("ঔষধের দোকান").check();
  await page.getByRole("button", { name: "শুরু করুন" }).click();
  await page.waitForURL(/\/app$/);

  // A product, and stock for it.
  await page.goto("/app/shop/zamzam/products");
  await page.getByRole("button", { name: "নতুন পণ্য" }).click();
  await page.locator("#pf-name").fill("জমজম ৫ লিটার");
  await page.locator("#pf-price").fill("450");
  await page.getByRole("button", { name: "সংরক্ষণ" }).click();
  await page.getByRole("link", { name: "জমজম ৫ লিটার" }).click();
  await page.locator("#rs-qty").fill("100");
  await page.getByRole("button", { name: "নতুন স্টক এল" }).click();
  await expect(page.getByText("১০০", { exact: true })).toBeVisible();

  // A shop on today's route, with ৳500 carried over from before.
  await page.goto("/app/shop/zamzam/customers");
  await page.getByRole("button", { name: "নতুন দোকান" }).click();
  await page.locator("#cf-name").fill("আল-আমিন স্টোর");
  await page.locator("#cf-area").fill("মতিঝিল");
  await page.locator("#cf-route").selectOption({ index: todaysRoute() });
  await page.locator("#cf-due").fill("500");
  await page.getByRole("button", { name: "সংরক্ষণ" }).click();
  await expect(page.getByRole("link", { name: "আল-আমিন স্টোর" })).toBeVisible();

  // Deliver 10 jars (৳4,500), take ৳1,500 now: the shop now owes 500 + 4,500 − 1,500.
  await page.goto("/app/shop/zamzam/routes");
  await page.getByRole("link", { name: "আজকের রোড" }).click();
  await page.waitForURL(/routes\/[0-9a-f-]{36}/);
  await page.getByRole("spinbutton").first().fill("10");
  await page.getByPlaceholder("0").nth(1).fill("1500");
  await page.getByRole("button", { name: "লিখে রাখুন" }).click();
  await expect(page.getByText("আজ দেওয়া হয়েছে · ১০")).toBeVisible();
  await expect(page.getByText("বকেয়া ৳৩,৫০০")).toBeVisible();
  await snap(page, "20-route-day");

  // The shop's daily statement and the agency statement both show the ৳1,500.
  await page.goto("/app/shop/zamzam/daily");
  await expect(page.getByText("৳১,৫০০").first()).toBeVisible();
  await page.goto("/app/statements?unit=zamzam");
  await expect(page.getByText("৳১,৫০০").first()).toBeVisible();
  await snap(page, "21-statement");

  // A login that opens only the medicine shop.
  await page.goto("/app/team");
  await page.locator("#tm-name").fill("Pharmacist");
  await page.locator("#tm-email").fill(`pharmacy-${stamp}@example.com`);
  await page.locator("#tm-password").fill("Pharma-2026-ok");
  await page.getByRole("button", { name: "লগইন তৈরি করুন" }).click();
  await expect(page.getByText("লগইন তৈরি হয়েছে")).toBeVisible();

  await page.getByRole("button", { name: "লগআউট" }).first().click();
  await page.waitForURL("**/sign-in");
  await page.locator("#email").fill(`pharmacy-${stamp}@example.com`);
  await page.locator("#password").fill("Pharma-2026-ok");
  await page.getByRole("button", { name: "লগইন" }).click();
  await page.waitForURL(/\/app\/shop\/medicine$/);
  await expect(page.getByRole("heading", { name: "ঔষধের দোকান" })).toBeVisible();
  await expect(page.getByRole("link", { name: "হাজী" })).toHaveCount(0);
  await page.goto("/app/shop/zamzam");
  await expect(page.getByText("আপনার লগইনে এই দোকান খোলার অনুমতি নেই")).toBeVisible();
});
