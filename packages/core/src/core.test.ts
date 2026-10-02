import { describe, expect, it } from "vitest";
import {
  allocate,
  amountInWords,
  BN_0_99,
  buildStatement,
  calculateSalary,
  convert,
  formatMoney,
  formatReference,
  integerToWords,
  normalizeBdPhone,
  outstanding,
  parseAmount,
  parseRate,
  parseReference,
  periodKey,
  withRunningBalance,
  type LedgerLine,
} from "./index";

describe("money", () => {
  it("parses typed amounts into paisa", () => {
    expect(parseAmount("12,500.5")).toBe(1_250_050);
    expect(parseAmount("১২৫০০.৫০")).toBe(1_250_050);
    expect(parseAmount("0.01")).toBe(1);
    expect(parseAmount("-40")).toBe(-4000);
  });

  it("rejects ambiguous input instead of rounding", () => {
    expect(() => parseAmount("1.005")).toThrow();
    expect(() => parseAmount("12a")).toThrow();
    expect(() => parseAmount("")).toThrow();
  });

  it("formats BDT with lakh grouping and SAR with thousands", () => {
    expect(formatMoney(1_234_567_89, "BDT", "en")).toBe("৳12,34,567.89");
    expect(formatMoney(1_234_567_89, "BDT", "bn")).toBe("৳১২,৩৪,৫৬৭.৮৯");
    expect(formatMoney(1_234_567_00, "SAR", "en", { compactFraction: true })).toBe("SAR 1,234,567");
    expect(formatMoney(-500, "BDT", "en")).toBe("-৳5.00");
  });

  it("converts SAR to BDT with integer rates", () => {
    const rate = parseRate("32.45");
    expect(rate).toBe(32_450_000);
    expect(convert(1_000_00, rate)).toBe(32_450_00);
    // 0.33 SAR × 32.45 = 10.7085 BDT → 10.71
    expect(convert(33, rate)).toBe(1071);
  });

  it("allocates without losing a paisa", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    const parts = allocate(1_000_001, [3, 5, 2]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_000_001);
  });
});

describe("words", () => {
  it("has a word for every number below one hundred", () => {
    expect(BN_0_99).toHaveLength(100);
    expect(new Set(BN_0_99).size).toBe(100);
  });

  it("spells numbers with crore and lakh", () => {
    expect(integerToWords(125_000, "en")).toBe("One Lakh Twenty-Five Thousand");
    expect(integerToWords(125_000, "bn")).toBe("এক লক্ষ পঁচিশ হাজার");
    expect(integerToWords(10_50_00_101, "en")).toBe("Ten Crore Fifty Lakh One Hundred One");
    expect(integerToWords(0, "bn")).toBe("শূন্য");
  });

  it("writes receipt amounts in both languages", () => {
    expect(amountInWords(5_75_000_50, "BDT", "bn")).toBe(
      "পাঁচ লক্ষ পঁচাত্তর হাজার টাকা এবং পঞ্চাশ পয়সা মাত্র",
    );
    expect(amountInWords(5_75_000_50, "BDT", "en")).toBe(
      "Five Lakh Seventy-Five Thousand Taka and Fifty Paisa Only",
    );
    expect(amountInWords(0, "BDT", "en")).toBe("Zero Taka Only");
    expect(amountInWords(25, "SAR", "en")).toBe("Twenty-Five Halala Only");
  });
});

describe("ids", () => {
  it("formats and parses reference numbers", () => {
    const ref = formatReference({ prefix: "HJ", year: 2026, sequence: 123 });
    expect(ref).toBe("HJ-26-000123");
    expect(parseReference("hj-26-000123")).toEqual({ prefix: "HJ", yy: 26, sequence: 123 });
    expect(parseReference("HJ26000123")).toBeNull();
  });

  it("normalises Bangladeshi mobile numbers", () => {
    expect(normalizeBdPhone("01712-345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("+880 1712 345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("০১৭১২৩৪৫৬৭৮")).toBe("+8801712345678");
    expect(normalizeBdPhone("01212345678")).toBeNull();
  });
});

describe("salary", () => {
  it("calculates net pay with pro-rata absence", () => {
    const result = calculateSalary({
      basic: 30_000_00,
      allowances: [
        { label: "House rent", amount: 12_000_00 },
        { label: "Transport", amount: 2_000_00 },
      ],
      deductions: [{ label: "Provident fund", amount: 1_500_00 }],
      advanceRecovery: 5_000_00,
      workingDays: 26,
      unpaidAbsentDays: 2,
      overtimeHours: 4.5,
      overtimeRate: 250_00,
    });
    expect(result.overtime).toBe(1_125_00);
    expect(result.gross).toBe(45_125_00);
    // 30000 × 2 / 26 = 2307.69
    expect(result.absenceDeduction).toBe(2_307_69);
    expect(result.net).toBe(45_125_00 - 2_307_69 - 1_500_00 - 5_000_00);
  });

  it("rejects impossible attendance", () => {
    expect(() =>
      calculateSalary({
        basic: 1,
        allowances: [],
        deductions: [],
        advanceRecovery: 0,
        workingDays: 26,
        unpaidAbsentDays: 27,
      }),
    ).toThrow();
  });
});

describe("statement", () => {
  it("uses Dhaka wall-clock days", () => {
    // 19:30 UTC on 1 Oct is 01:30 on 2 Oct in Dhaka.
    const late = new Date("2026-10-01T19:30:00Z");
    expect(periodKey(late, "day")).toBe("2026-10-02");
    expect(periodKey(late, "day", "UTC")).toBe("2026-10-01");
    expect(periodKey(late, "month")).toBe("2026-10");
  });

  const lines: LedgerLine[] = [
    { occurredAt: new Date("2026-10-01T04:00:00Z"), unit: "hajj", direction: "in", amount: 200_000_00, currency: "BDT" },
    { occurredAt: new Date("2026-10-01T06:00:00Z"), unit: "zamzam", direction: "in", amount: 3_500_00, currency: "BDT" },
    { occurredAt: new Date("2026-10-01T08:00:00Z"), unit: "office", direction: "out", amount: 45_000_00, currency: "BDT" },
    { occurredAt: new Date("2026-10-02T05:00:00Z"), unit: "coffee", direction: "in", amount: 1_250_00, currency: "BDT" },
    { occurredAt: new Date("2026-10-02T05:00:00Z"), unit: "hajj", direction: "out", amount: 8_000_00, currency: "SAR" },
  ];

  it("groups by day, currency and business unit", () => {
    const rows = buildStatement(lines, "day");
    expect(rows.map((r) => `${r.period} ${r.currency}`)).toEqual([
      "2026-10-01 BDT",
      "2026-10-02 BDT",
      "2026-10-02 SAR",
    ]);
    expect(rows[0]!.totals).toEqual({ in: 203_500_00, out: 45_000_00, net: 158_500_00, count: 3 });
    expect(rows[0]!.byUnit.zamzam?.in).toBe(3_500_00);
  });

  it("monthly totals equal the sum of daily totals", () => {
    const daily = buildStatement(lines, "day").filter((r) => r.currency === "BDT");
    const monthly = buildStatement(lines, "month").filter((r) => r.currency === "BDT");
    expect(monthly).toHaveLength(1);
    expect(monthly[0]!.totals.net).toBe(daily.reduce((a, r) => a + r.totals.net, 0));
  });

  it("carries a running balance per currency", () => {
    const rows = withRunningBalance(buildStatement(lines, "day"), { BDT: 10_000_00 });
    expect(rows[0]!.closingBalance).toBe(168_500_00);
    expect(rows[1]!.openingBalance).toBe(168_500_00);
    expect(rows[2]!.closingBalance).toBe(-8_000_00);
  });

  it("calculates what a pilgrim still owes", () => {
    expect(outstanding(6_50_000_00, [2_00_000_00, 1_50_000_00], [10_000_00])).toEqual({
      paid: 3_50_000_00,
      discount: 10_000_00,
      due: 2_90_000_00,
      overpaid: 0,
    });
  });
});
