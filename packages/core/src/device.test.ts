import { describe, expect, it } from "vitest";
import { describeDevice, maskEmail } from "./device";

describe("describeDevice", () => {
  it("names common browsers and systems", () => {
    expect(
      describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36").label,
    ).toBe("Desktop · Chrome · macOS");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1").label).toBe(
      "Mobile · Safari · iOS",
    );
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0").label).toBe(
      "Desktop · Edge · Windows",
    );
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36").label).toBe(
      "Tablet · Chrome · Android",
    );
  });

  it("copes with nothing to go on", () => {
    expect(describeDevice("").label).toBe("Unknown device");
    expect(describeDevice(undefined).deviceType).toBe("");
    expect(describeDevice("curl/8.4.0").deviceType).toBe("bot");
  });
});

describe("maskEmail", () => {
  it("keeps the first two letters, the last letter and the domain", () => {
    expect(maskEmail("shiplulink2003@gmail.com")).toBe("sh•••••••••••3@gmail.com");
    expect(maskEmail("abc@x.com")).toBe("a••@x.com");
    expect(maskEmail("a@x.com")).toBe("a•@x.com");
  });

  it("returns nothing for something that is not an email", () => {
    expect(maskEmail("not-an-email")).toBe("");
  });
});
