import { describe, expect, it } from "vitest";
import { codeSms, receiptSms, smsSize } from "./sms";

describe("smsSize", () => {
  it("counts plain English as GSM-7 and Bangla as Unicode", () => {
    expect(smsSize("Hello")).toMatchObject({ unicode: false, parts: 1 });
    expect(smsSize("a".repeat(160)).parts).toBe(1);
    expect(smsSize("a".repeat(161)).parts).toBe(2);
    expect(smsSize("ক".repeat(70))).toMatchObject({ unicode: true, parts: 1, remaining: 0 });
    expect(smsSize("ক".repeat(71)).parts).toBe(2);
    expect(smsSize("ক".repeat(134)).parts).toBe(2);
    expect(smsSize("ক".repeat(135)).parts).toBe(3);
    expect(smsSize("").parts).toBe(0);
  });

  it("counts extension characters twice", () => {
    expect(smsSize("€".repeat(80)).length).toBe(160);
    expect(smsSize("€".repeat(81)).parts).toBe(2);
  });
});

describe("receiptSms", () => {
  it("says what was paid and what is still due, in two parts at most", () => {
    const text = receiptSms({ agency: "Noor Travels", amount: 5_000_000, receiptNo: "NR-26-000219", due: 33_500_000, verifyUrl: "https://hajj.takatracker.com/verify/abcdefghijklmnopqrstuv" });
    expect(text).toBe("Noor Travels: ৳৫০,০০০ জমা হয়েছে, রসিদ NR-26-000219। বাকি ৳৩,৩৫,০০০। যাচাই: https://hajj.takatracker.com/verify/abcdefghijklmnopqrstuv");
    expect(smsSize(text).parts).toBeLessThanOrEqual(3);
    expect(receiptSms({ agency: "A", amount: 100, receiptNo: "R", due: 0, verifyUrl: "u" })).toContain("সব টাকা পরিশোধ হয়েছে");
  });

  it("shortens a long agency name", () => {
    const text = receiptSms({ agency: "Al-Madina International Hajj and Umrah Services Ltd", amount: 100, receiptNo: "R", due: 0, verifyUrl: "u" });
    expect(text.startsWith("Al-Madina International…:")).toBe(true);
  });
});

describe("codeSms", () => {
  it("names what the code is for", () => {
    expect(codeSms("123456", "verify")).toContain("মোবাইল যাচাইয়ের কোড 123456");
    expect(codeSms("123456", "reset")).toContain("পাসওয়ার্ড রিসেটের কোড 123456");
  });
});
