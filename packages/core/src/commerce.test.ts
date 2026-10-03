import { describe, expect, it } from "vitest";
import {
  addDays,
  bookingTotal,
  customerBalance,
  daysUntil,
  monthRange,
  nights,
  periodRange,
  pickBatches,
  routeNumber,
  saleTotals,
  weekdayOf,
} from "./commerce";

describe("saleTotals", () => {
  it("adds lines in paisa and applies the discount once", () => {
    const t = saleTotals(
      [
        { qty: 3, unitPrice: 12_50 },
        { qty: 1, unitPrice: 199_99 },
      ],
      10_00,
    );
    expect(t).toEqual({ subtotal: 237_49, discount: 10_00, total: 227_49, paid: 227_49, due: 0 });
  });

  it("keeps the unpaid part as due", () => {
    expect(saleTotals([{ qty: 10, unitPrice: 120_00 }], 0, 500_00)).toMatchObject({
      total: 1200_00,
      paid: 500_00,
      due: 700_00,
    });
  });

  it("refuses bad carts", () => {
    expect(() => saleTotals([])).toThrow("EMPTY_CART");
    expect(() => saleTotals([{ qty: 0, unitPrice: 100 }])).toThrow("INVALID_QTY");
    expect(() => saleTotals([{ qty: 1.5, unitPrice: 100 }])).toThrow("INVALID_QTY");
    expect(() => saleTotals([{ qty: 1, unitPrice: 100 }], 101)).toThrow("INVALID_DISCOUNT");
    expect(() => saleTotals([{ qty: 1, unitPrice: 100 }], 0, 101)).toThrow("INVALID_PAID");
  });
});

describe("pickBatches", () => {
  const batches = [
    { id: "b", expiresOn: "2027-03-01", qty: 10 },
    { id: "a", expiresOn: "2026-12-01", qty: 4 },
    { id: "old", expiresOn: "2026-09-30", qty: 50 },
  ];

  it("sells the batch that expires first, and never an expired one", () => {
    expect(pickBatches(batches, 6, "2026-10-03")).toEqual([
      { batchId: "a", qty: 4 },
      { batchId: "b", qty: 2 },
    ]);
  });

  it("fails when unexpired stock is short", () => {
    expect(() => pickBatches(batches, 15, "2026-10-03")).toThrow("OUT_OF_STOCK");
  });

  it("counts days to expiry", () => {
    expect(daysUntil("2026-10-13", "2026-10-03")).toBe(10);
    expect(daysUntil("2026-10-01", "2026-10-03")).toBe(-2);
  });
});

describe("customerBalance", () => {
  it("adds opening due and unpaid sales, minus payments", () => {
    expect(
      customerBalance(
        500_00,
        [
          { total: 1200_00, paid: 200_00 },
          { total: 600_00, paid: 600_00 },
        ],
        [300_00],
      ),
    ).toBe(1200_00);
  });
});

describe("routes", () => {
  it("numbers routes from Saturday", () => {
    expect(weekdayOf("2026-10-03")).toBe(6); // a Saturday
    expect(routeNumber(6)).toBe(1);
    expect(routeNumber(0)).toBe(2);
    expect(routeNumber(4)).toBe(6); // Thursday
    expect(routeNumber(5)).toBe(7);
  });

  it("moves across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("hotel bookings", () => {
  it("charges rooms × nights × rate", () => {
    expect(nights("2027-05-10", "2027-05-18")).toBe(8);
    expect(
      bookingTotal({ checkIn: "2027-05-10", checkOut: "2027-05-18", rooms: 5, rate: 450_00 }),
    ).toBe(18_000_00);
  });

  it("rejects a check-out on or before check-in", () => {
    expect(() => nights("2027-05-10", "2027-05-10")).toThrow("INVALID_DATES");
  });
});

describe("periods", () => {
  it("knows month lengths, including leap years", () => {
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-02").to).toBe("2026-02-28");
  });

  it("reads day, month and year keys", () => {
    expect(periodRange("2026-10-03")).toEqual({
      from: "2026-10-03",
      to: "2026-10-03",
      period: "day",
    });
    expect(periodRange("2026-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      period: "month",
    });
    expect(periodRange("2026")).toEqual({ from: "2026-01-01", to: "2026-12-31", period: "year" });
    expect(() => periodRange("10-2026")).toThrow("INVALID_PERIOD");
  });
});
