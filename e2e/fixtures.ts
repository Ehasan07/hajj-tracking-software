import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

/**
 * A made-up client address. The app keys rate limits and the sign-in lockout
 * on X-Real-IP (nginx sets it in production), so each test, and each extra
 * browser a test opens, comes from its own address and can't use up another
 * test's allowance.
 */
export function clientAddress() {
  const n = () => Math.floor(Math.random() * 254) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

/** A made-up Bangladeshi mobile number, different for every call (a verified number belongs to one account). */
export function mobileNumber() {
  return `017${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

/** Sign-up asks for a mobile number when SMS works; type the code it was sent. */
export async function passPhoneStep(page: import("@playwright/test").Page, phone: string, since: Date) {
  const { waitForSmsCode } = await import("./mail");
  await page.getByRole("textbox", { name: "৬ সংখ্যার কোড 1" }).click();
  await page.keyboard.type(await waitForSmsCode(phone, since));
}

export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => {
    await use({ "x-real-ip": clientAddress() });
  },
});
