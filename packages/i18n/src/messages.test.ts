import { describe, expect, it } from "vitest";
import { messages } from "./index";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("Bangla and English have exactly the same keys", () => {
    expect(keys(messages.en).sort()).toEqual(keys(messages.bn).sort());
  });

  it("no message is left empty", () => {
    for (const locale of Object.values(messages)) {
      for (const key of keys(locale)) {
        const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], locale);
        expect(String(value).trim(), key).not.toBe("");
      }
    }
  });
});
