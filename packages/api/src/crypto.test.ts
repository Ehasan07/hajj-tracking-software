import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { blindIndex, decryptBytes, decryptField, encryptBytes, encryptField } from "./crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.BLIND_INDEX_KEY = randomBytes(32).toString("base64");
});

describe("field encryption", () => {
  it("round-trips and never repeats ciphertext", () => {
    const a = encryptField("A01234567");
    const b = encryptField("A01234567");
    expect(a).not.toBe(b);
    expect(a).not.toContain("A01234567");
    expect(decryptField(a)).toBe("A01234567");
  });

  it("detects tampering", () => {
    const stored = encryptField("A01234567");
    const flipped = stored.slice(0, -2) + (stored.endsWith("A") ? "B" : "A") + stored.slice(-1);
    expect(() => decryptField(flipped)).toThrow();
  });

  it("builds a stable per-tenant blind index", () => {
    expect(blindIndex("t1", "A01234567")).toBe(blindIndex("t1", "A01234567"));
    expect(blindIndex("t1", "A01234567")).not.toBe(blindIndex("t2", "A01234567"));
    expect(blindIndex("t1", "A01234567")).not.toBe(blindIndex("t1", "A01234568"));
  });

  it("encrypts files with an authenticated envelope", () => {
    const file = randomBytes(5000);
    const sealed = encryptBytes(file);
    expect(sealed.subarray(0, 4).toString()).toBe("HJE1");
    expect(decryptBytes(sealed).equals(file)).toBe(true);
    sealed[sealed.length - 1]! ^= 1;
    expect(() => decryptBytes(sealed)).toThrow();
  });
});
