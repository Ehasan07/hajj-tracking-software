import { describe, expect, it } from "vitest";
import { checkPassword, generatePassword } from "./password";

describe("checkPassword", () => {
  it("passes a long mixed password and scores it strong", () => {
    const c = checkPassword("Demo-Hajj-2026");
    expect(c.ok).toBe(true);
    expect(c.score).toBeGreaterThanOrEqual(3);
    expect(checkPassword("Rx7#mangoTree!river").score).toBe(4);
  });

  it("names each missing rule", () => {
    const c = checkPassword("correct-horse-battery");
    expect(c.ok).toBe(false);
    expect(c.rules).toMatchObject({ length: true, lower: true, upper: false, number: false, symbol: true });
    expect(c.score).toBeLessThanOrEqual(1);
    expect(checkPassword("Short1a").rules.length).toBe(false);
  });

  it("refuses well-known passwords, with swaps and padding", () => {
    for (const p of ["Password123", "P@ssw0rd2026!", "Bismillah2026", "Hajj2026!!", "Allah-Hajj-2026", "Qwerty12345", "1234567890", "Bangladesh@1"]) {
      const c = checkPassword(p);
      expect(c.rules.notCommon, p).toBe(false);
      expect(c.ok, p).toBe(false);
      expect(c.score, p).toBe(0);
    }
  });

  it("refuses a password built on the person's name or email", () => {
    const who = { name: "Ehasanul Haque Shiplu", email: "shiplulink2003@gmail.com" };
    expect(checkPassword("Shiplu@2026x", who).rules.notPersonal).toBe(false);
    expect(checkPassword("Ehasanul#9988", who).rules.notPersonal).toBe(false);
    expect(checkPassword("Shiplulink2003", who).ok).toBe(false);
    expect(checkPassword("Rx7#mangoTree!river", who).rules.notPersonal).toBe(true);
  });

  it("counts Bangla digits as numbers", () => {
    expect(checkPassword("Mango-Tree-২০২৬").rules.number).toBe(true);
  });

  it("treats repeats, long runs and few different characters as guessable", () => {
    for (const p of ["Aaaa1111bbbb", "Abcdefgh12", "Qwerty-Zx-91", "Xy12345678", "AbAbAb1212"]) {
      expect(checkPassword(p).rules.notCommon, p).toBe(false);
    }
    expect(checkPassword("Kx9-pLm4-qWz").rules.notCommon).toBe(true);
  });
});

describe("generatePassword", () => {
  it("makes 16-character passwords that pass every rule", () => {
    const random = (max: number) => Math.floor(Math.random() * max);
    for (let i = 0; i < 50; i++) {
      const p = generatePassword(random);
      expect(p).toHaveLength(16);
      expect(checkPassword(p).ok).toBe(true);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });
});
