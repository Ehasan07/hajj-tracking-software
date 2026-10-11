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

export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => {
    await use({ "x-real-ip": clientAddress() });
  },
});
