import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { addDays } from "@hajj/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql } from "@hajj/db";
import { member, organization, user } from "@hajj/db/schema";
import { appRouter } from "./root";
import { createCallerFactory, createContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const tenantId = randomUUID();
const ownerId = randomUUID();
const staffId = randomUUID();

const as = (userId: string) =>
  createCaller(createContext({ session: { userId, activeOrganizationId: tenantId } }));
const owner = () => as(ownerId);
const staff = () => as(staffId);

let today: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: `${ownerId}@test.local` },
    { id: staffId, name: "Staff", email: `${staffId}@test.local` },
  ]);
  await db
    .insert(organization)
    .values({
      id: tenantId,
      name: "Shops Agency",
      slug: `shops-${tenantId}`,
      createdAt: new Date(),
    });
  await db.insert(member).values([
    {
      id: randomUUID(),
      organizationId: tenantId,
      userId: ownerId,
      role: "owner",
      createdAt: new Date(),
    },
    {
      id: randomUUID(),
      organizationId: tenantId,
      userId: staffId,
      role: "staff",
      createdAt: new Date(),
    },
  ]);
  await owner().tenant.initialize({
    organizationId: tenantId,
    legalName: "Shops Agency Ltd",
    referencePrefix: "SA",
    defaultLocale: "bn",
    enabledUnits: ["hajj", "office", "medicine", "zamzam", "coffee", "supernova"],
  });
  const settings = await owner().statements.summary({ key: "2026" });
  today = settings.today;
});

afterAll(async () => {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`delete from organization where id = ${tenantId}`;
  await ownerDb`delete from "user" where id in (${ownerId}, ${staffId}) or email like ${`%@${tenantId}.test`}`;
  await ownerDb.end();
  await rawSql.end();
});

describe("medicine shop", () => {
  let paracetamol: string;

  it("keeps stock in batches and sells the one expiring first", async () => {
    const p = await staff().shop.saveProduct({
      unit: "medicine",
      name: "Napa 500",
      genericName: "Paracetamol",
      strength: "500 mg",
      unitLabel: "strip",
      price: "12",
      usesBatches: true,
      trackStock: true,
      active: true,
      reorderLevel: 5,
    });
    paracetamol = p.id;
    await staff().shop.receiveStock({
      unit: "medicine",
      productId: p.id,
      qty: 10,
      batchNo: "LATE",
      expiresOn: addDays(today, 400),
    });
    await staff().shop.receiveStock({
      unit: "medicine",
      productId: p.id,
      qty: 4,
      batchNo: "SOON",
      expiresOn: addDays(today, 20),
    });
    await expect(
      staff().shop.receiveStock({
        unit: "medicine",
        productId: p.id,
        qty: 4,
        batchNo: "X",
        expiresOn: today,
      }),
    ).rejects.toThrow(/EXPIRED_BATCH/);
    await expect(
      staff().shop.receiveStock({ unit: "medicine", productId: p.id, qty: 4 }),
    ).rejects.toThrow(/BATCH_REQUIRED/);

    const sale = await staff().shop.sell({
      unit: "medicine",
      items: [{ productId: p.id, qty: 6 }],
      method: "cash",
    });
    expect(sale.ref).toMatch(/^MD-\d{2}-000001$/);
    expect(sale.totals).toMatchObject({ total: 72_00, paid: 72_00, due: 0 });

    const batches = await staff().shop.batches({ unit: "medicine", productId: p.id });
    expect(batches.map((b) => [b.batchNo, b.qty])).toEqual([
      ["SOON", 0],
      ["LATE", 8],
    ]);
    const receipt = await staff().shop.sale({ unit: "medicine", id: sale.id });
    expect(receipt.items.map((i) => [i.batchNo, i.qty, i.lineTotal])).toEqual([
      ["SOON", 4, 48_00],
      ["LATE", 2, 24_00],
    ]);
  });

  it("refuses to sell more than is on the shelf", async () => {
    await expect(
      staff().shop.sell({
        unit: "medicine",
        items: [{ productId: paracetamol, qty: 9 }],
        method: "cash",
      }),
    ).rejects.toThrow(/OUT_OF_STOCK/);
  });

  it("a credit sale needs a customer", async () => {
    await expect(
      staff().shop.sell({
        unit: "medicine",
        items: [{ productId: paracetamol, qty: 1 }],
        paid: "0",
        method: "cash",
      }),
    ).rejects.toThrow(/CUSTOMER_REQUIRED/);
  });

  it("voiding puts stock back and reverses the money; only managers may void", async () => {
    const sale = await staff().shop.sell({
      unit: "medicine",
      items: [{ productId: paracetamol, qty: 3 }],
      method: "bkash",
      reference: "TX1",
    });
    await expect(
      staff().shop.voidSale({ unit: "medicine", id: sale.id, reason: "wrong item" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await owner().shop.voidSale({ unit: "medicine", id: sale.id, reason: "wrong item" });
    await expect(
      owner().shop.voidSale({ unit: "medicine", id: sale.id, reason: "again" }),
    ).rejects.toThrow(/ALREADY_VOID/);
    const [product] = (await staff().shop.products({ unit: "medicine" })).filter(
      (p) => p.id === paracetamol,
    );
    expect(product!.stockQty).toBe(8);
    const day = await staff().shop.daily({ unit: "medicine" });
    expect(day.sales.total).toBe(72_00);
    expect(day.ledger).toEqual({ in: 72_00 + 36_00, out: 36_00, net: 72_00 });
    expect(day.voided).toHaveLength(1);
  });

  it("lists batches about to expire", async () => {
    const soon = await staff().shop.expiring({ unit: "medicine", days: 30 });
    expect(soon.rows).toHaveLength(0); // the SOON batch sold out
  });
});

describe("zamzam routes", () => {
  let jar: string;
  let shop: string;
  let saturdayRoute: string;

  it("has seven routes, one per weekday", async () => {
    const routes = await staff().shop.routes({ unit: "zamzam" });
    expect(routes.map((r) => r.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    saturdayRoute = routes.find(
      (r) => r.weekday === new Date(`${today}T12:00:00Z`).getUTCDay(),
    )!.id;
    await staff().shop.saveRoute({ unit: "zamzam", id: saturdayRoute, name: "Motijheel" });
  });

  it("delivers on credit, shows it on today's route, and collects the due", async () => {
    jar = (
      await staff().shop.saveProduct({
        unit: "zamzam",
        name: "Zamzam 5 L",
        unitLabel: "jar",
        price: "450",
        trackStock: true,
        usesBatches: false,
        active: true,
      })
    ).id;
    await staff().shop.receiveStock({ unit: "zamzam", productId: jar, qty: 100 });
    shop = (
      await staff().shop.saveCustomer({
        unit: "zamzam",
        name: "Al Amin Store",
        area: "Motijheel",
        routeId: saturdayRoute,
        openingDue: "1000",
        sortOrder: 1,
        active: true,
      })
    ).id;

    const sale = await staff().shop.sell({
      unit: "zamzam",
      items: [{ productId: jar, qty: 10 }],
      customerId: shop,
      routeId: saturdayRoute,
      paid: "1500",
      method: "cash",
    });
    expect(sale.totals).toMatchObject({ total: 4500_00, paid: 1500_00, due: 3000_00 });

    const day = await staff().shop.routeDay({ unit: "zamzam" });
    expect(day.route.id).toBe(saturdayRoute);
    const row = day.shops.find((s) => s.id === shop)!;
    expect(row).toMatchObject({ qty: 10, total: 4500_00, paid: 1500_00, balance: 4000_00 });

    await expect(
      staff().shop.collect({ unit: "zamzam", customerId: shop, amount: "5000", method: "cash" }),
    ).rejects.toThrow(/OVERPAYMENT:400000/);
    const paid = await staff().shop.collect({
      unit: "zamzam",
      customerId: shop,
      amount: "2500",
      method: "cash",
    });
    expect(paid.balance).toBe(1500_00);

    const report = await staff().shop.deliveries({
      unit: "zamzam",
      from: addDays(today, -6),
      to: today,
    });
    expect(report.rows[0]).toMatchObject({
      name: "Al Amin Store",
      qty: 10,
      total: 4500_00,
      deliveries: 1,
    });
  });

  it("only managers may date an entry in the past", async () => {
    const yesterday = addDays(today, -1);
    await expect(
      staff().shop.sell({
        unit: "zamzam",
        items: [{ productId: jar, qty: 1 }],
        method: "cash",
        date: yesterday,
      }),
    ).rejects.toThrow(/BACKDATE_NOT_ALLOWED/);
    await expect(
      owner().shop.sell({
        unit: "zamzam",
        items: [{ productId: jar, qty: 1 }],
        method: "cash",
        date: addDays(today, 1),
      }),
    ).rejects.toThrow(/FUTURE_DATE/);
    const late = await owner().shop.sell({
      unit: "zamzam",
      items: [{ productId: jar, qty: 1 }],
      method: "cash",
      date: yesterday,
    });
    expect((await owner().shop.daily({ unit: "zamzam", date: yesterday })).sales.total).toBe(
      450_00,
    );
    expect(late.ref).toMatch(/^ZM-/);
  });
});

describe("statements", () => {
  it("adds every unit's money for the day, and carries the balance forward", async () => {
    await owner().expenses.create({
      unit: "office",
      category: "rent",
      amount: "2000",
      method: "cash",
    });
    const day = await owner().statements.summary({ key: today });
    const bdt = day.currencies.find((c) => c.currency === "BDT")!;
    // medicine: 72 + 36 in, 36 out; zamzam: 1500 + 2500 in; office: 2000 out.
    expect(bdt.byUnit.medicine).toMatchObject({ in: 108_00, out: 36_00 });
    expect(bdt.byUnit.zamzam).toMatchObject({ in: 4000_00, out: 0 });
    expect(bdt.byUnit.office).toMatchObject({ in: 0, out: 2000_00 });
    expect(bdt.opening).toBe(450_00); // yesterday's late zamzam sale
    expect(bdt.closing).toBe(450_00 + 108_00 - 36_00 + 4000_00 - 2000_00);
    expect(day.entries.length).toBe(bdt.totals.count);

    const month = await owner().statements.summary({ key: today.slice(0, 7) });
    const m = month.currencies.find((c) => c.currency === "BDT")!;
    expect(m.rows.at(-1)!.closingBalance).toBe(m.closing);
    const zamzamOnly = await owner().statements.summary({ key: today, unit: "zamzam" });
    expect(zamzamOnly.currencies[0]!.totals.in).toBe(4000_00);
  });

  it("is closed to plain staff", async () => {
    await expect(staff().statements.summary({ key: today })).rejects.toThrow(/FORBIDDEN/);
  });
});

describe("payroll", () => {
  it("generates a sheet, recovers an advance, locks and pays it into the ledger", async () => {
    const emp = await owner().payroll.saveEmployee({
      name: "Karim Mia",
      designation: "Office assistant",
      basic: "15000",
      allowances: [{ label: "House", amount: "3000" }],
      active: true,
    });
    await owner().payroll.giveAdvance({ employeeId: emp.id, amount: "4000", method: "cash" });
    const month = today.slice(0, 7);
    await owner().payroll.generate({ month, workingDays: 26 });
    const sheet = (await owner().payroll.sheet({ month }))!;
    const line = sheet.lines.find((l) => l.employeeId === emp.id)!;
    expect(line.net).toBe(18_000_00);

    await expect(
      owner().payroll.updateLine({
        lineId: line.id,
        allowances: [{ label: "House", amount: "3000" }],
        deductions: [],
        unpaidAbsentDays: 2,
        overtimeHours: 0,
        overtimeRate: "0",
        advanceRecovery: "5000",
      }),
    ).rejects.toThrow(/ADVANCE_EXCEEDS:400000/);
    const r = await owner().payroll.updateLine({
      lineId: line.id,
      allowances: [{ label: "House", amount: "3000" }],
      deductions: [],
      unpaidAbsentDays: 2,
      overtimeHours: 4,
      overtimeRate: "100",
      advanceRecovery: "2000",
    });
    // 15000 + 3000 + 400 overtime − (15000 × 2/26 = 1153.85) − 2000
    expect(r).toMatchObject({
      gross: 18_400_00,
      absenceDeduction: 1153_85,
      net: 18_400_00 - 1153_85 - 2000_00,
    });

    await owner().payroll.lock({ id: sheet.sheet.id });
    await expect(
      owner().payroll.updateLine({
        lineId: line.id,
        allowances: [],
        deductions: [],
        unpaidAbsentDays: 0,
        overtimeHours: 0,
        overtimeRate: "0",
        advanceRecovery: "0",
      }),
    ).rejects.toThrow(/SHEET_LOCKED/);
    const paid = await owner().payroll.pay({ id: sheet.sheet.id, method: "bank" });
    expect(paid.paid).toBe(r.net);
    await expect(owner().payroll.unlock({ id: sheet.sheet.id })).rejects.toThrow(/SHEET_PAID/);

    const employees = await owner().payroll.employees();
    expect(employees.find((e) => e.id === emp.id)!.advanceDue).toBe(2000_00);
    const office = await owner().statements.summary({ key: today, unit: "office" });
    expect(office.currencies[0]!.totals.out).toBe(2000_00 + 4000_00 + r.net);
  });

  it("is closed to plain staff", async () => {
    await expect(staff().payroll.employees()).rejects.toThrow(/FORBIDDEN/);
  });
});

describe("hotels", () => {
  it("prices a booking, fills rooms up to capacity, and never double-books a pilgrim", async () => {
    const pkg = await owner().packages.create({
      kind: "umrah",
      name: "Umrah",
      season: "1448",
      price: "145000",
    });
    const people = await Promise.all(
      ["A One", "B Two", "C Three"].map((fullName, i) =>
        staff().pilgrims.create({
          fullName,
          phone: `0171100000${i}`,
          packageId: pkg.id,
          passportNumber: `ZX${1000000 + i}`,
          passportExpiry: "2031-01-01",
          gender: "male",
        }),
      ),
    );
    const hotel = await staff().hotels.saveHotel({
      name: "Dar Al Eiman",
      city: "makkah",
      distance: "300 m",
      active: true,
    });
    const booking = await staff().hotels.saveBooking({
      hotelId: hotel.id,
      checkIn: "2027-01-10",
      checkOut: "2027-01-17",
      roomType: "double",
      rooms: 1,
      rate: "450",
      currency: "SAR",
      status: "confirmed",
    });
    expect(booking.ref).toMatch(/^HB-/);
    expect(booking.total).toBe(450_00 * 7);

    await staff().hotels.assign({ bookingId: booking.id, pilgrimId: people[0]!.id, roomNo: "1" });
    await staff().hotels.assign({ bookingId: booking.id, pilgrimId: people[1]!.id, roomNo: "1" });
    await expect(
      staff().hotels.assign({ bookingId: booking.id, pilgrimId: people[2]!.id, roomNo: "1" }),
    ).rejects.toThrow(/ROOM_FULL/);
    await expect(
      staff().hotels.assign({ bookingId: booking.id, pilgrimId: people[2]!.id, roomNo: "2" }),
    ).rejects.toThrow(/ROOM_OUT_OF_RANGE/);

    const other = await staff().hotels.saveBooking({
      hotelId: hotel.id,
      checkIn: "2027-01-15",
      checkOut: "2027-01-20",
      roomType: "quad",
      rooms: 1,
      rate: "300",
      currency: "SAR",
      status: "tentative",
    });
    await expect(
      staff().hotels.assign({ bookingId: other.id, pilgrimId: people[0]!.id, roomNo: "1" }),
    ).rejects.toThrow(/PILGRIM_DOUBLE_BOOKED/);
    await expect(
      staff().hotels.saveBooking({
        hotelId: hotel.id,
        checkIn: "2027-01-10",
        checkOut: "2027-01-17",
        roomType: "double",
        rooms: 1,
        rate: "450",
        currency: "SAR",
        status: "confirmed",
        id: booking.id,
      }),
    ).resolves.toBeTruthy();

    await expect(
      staff().hotels.pay({
        bookingId: booking.id,
        amount: "1000",
        method: "bank",
        reference: "W1",
      }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      owner().hotels.pay({
        bookingId: booking.id,
        amount: "4000",
        method: "bank",
        reference: "W1",
      }),
    ).rejects.toThrow(/OVERPAYMENT:315000/);
    const paid = await owner().hotels.pay({
      bookingId: booking.id,
      amount: "1000",
      method: "bank",
      reference: "W1",
    });
    expect(paid.due).toBe(2150_00);

    const night = await staff().hotels.occupancy({ from: "2027-01-15", days: 2 });
    expect(night[0]!.makkah).toEqual({ beds: 2 + 4, filled: 2 });
  });
});

describe("team logins", () => {
  it("makes a medicine-only login that can't see anything else", async () => {
    const email = `pharmacy@${tenantId}.test`;
    await expect(
      staff().team.create({
        name: "Pharmacist",
        email,
        password: "Pharma-2026!",
        role: "shop_operator",
        units: ["medicine"],
      }),
    ).rejects.toThrow(/FORBIDDEN/);
    const { userId } = await owner().team.create({
      name: "Pharmacist",
      email,
      password: "Pharma-2026!",
      role: "shop_operator",
      units: ["medicine"],
    });
    await expect(
      owner().team.create({ name: "Again", email, password: "Pharma-2026!", role: "staff" }),
    ).rejects.toThrow(/EMAIL_TAKEN/);

    const { default: postgres } = await import("postgres");
    const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
    const [acct] = await ownerDb<
      { password: string }[]
    >`select password from account where user_id = ${userId}`;
    await ownerDb.end();
    expect(await verifyPassword({ hash: acct!.password, password: "Pharma-2026!" })).toBe(true);

    const pharmacist = as(userId);
    expect((await pharmacist.tenant.me()).shops).toEqual(["medicine"]);
    expect((await pharmacist.shop.products({ unit: "medicine" })).length).toBeGreaterThan(0);
    await expect(pharmacist.shop.products({ unit: "zamzam" })).rejects.toThrow(/FORBIDDEN/);
    await expect(pharmacist.pilgrims.list({})).rejects.toThrow(/FORBIDDEN/);
    await expect(pharmacist.statements.summary({ key: today })).rejects.toThrow(/FORBIDDEN/);
  });

  it("switching a business off closes its shop", async () => {
    await owner().team.setUnits({ units: ["medicine", "zamzam", "coffee"] });
    await expect(staff().shop.products({ unit: "supernova" })).rejects.toThrow(/UNIT_DISABLED/);
    await owner().team.setUnits({ units: ["medicine", "zamzam", "coffee", "supernova"] });
  });
});
