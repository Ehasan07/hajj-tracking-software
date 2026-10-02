import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql, withTenant } from "@hajj/db";
import { ledgerEntries, member, organization, user } from "@hajj/db/schema";
import { appRouter } from "./root";
import { createCallerFactory, createContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const tenantId = randomUUID();
const otherTenantId = randomUUID();
const ownerId = randomUUID();
const staffId = randomUUID();

const owner = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: tenantId } }));
const staff = () => createCaller(createContext({ session: { userId: staffId, activeOrganizationId: tenantId } }));
const outsider = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: otherTenantId } }));

let packageId: string;
let pilgrimId: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: `${ownerId}@test.local` },
    { id: staffId, name: "Staff", email: `${staffId}@test.local` },
  ]);
  await db.insert(organization).values([
    { id: tenantId, name: "Flow Agency", slug: `flow-${tenantId}`, createdAt: new Date() },
    { id: otherTenantId, name: "Other", slug: `other-${otherTenantId}`, createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: randomUUID(), organizationId: tenantId, userId: ownerId, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: tenantId, userId: staffId, role: "staff", createdAt: new Date() },
  ]);
  await owner().tenant.initialize({
    organizationId: tenantId,
    legalName: "Flow Agency Ltd",
    referencePrefix: "FA",
    defaultLocale: "bn",
    enabledUnits: ["hajj", "office"],
  });
});

afterAll(async () => {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`delete from payments where tenant_id = ${tenantId}`;
  await ownerDb`delete from organization where id in (${tenantId}, ${otherTenantId})`;
  await ownerDb`delete from "user" where id in (${ownerId}, ${staffId})`;
  await ownerDb.end();
  await rawSql.end();
});

describe("hajj flow", () => {
  it("only admins create packages", async () => {
    await expect(
      staff().packages.create({ kind: "hajj", name: "Premium", season: "1448", price: "6,50,000" }),
    ).rejects.toThrow(/FORBIDDEN/);
    const pkg = await owner().packages.create({ kind: "hajj", name: "Premium", season: "1448", price: "6,50,000" });
    expect(pkg.price).toBe(6_50_000_00);
    packageId = pkg.id;
  });

  it("turns an inquiry into a pilgrim with the agency prefix", async () => {
    const inquiry = await staff().inquiries.create({ name: "Abdul Karim", phone: "01712-345678", interest: "hajj" });
    expect(inquiry.ref).toMatch(/^IQ-\d{2}-000001$/);

    const created = await staff().pilgrims.create({
      fullName: "Md. Abdul Karim",
      phone: "01712345678",
      packageId,
      discount: "10000",
      passportNumber: "a0 1234567",
      passportExpiry: "2031-01-01",
      inquiryId: inquiry.id,
    });
    expect(created.ref).toMatch(/^FA-\d{2}-000001$/);
    pilgrimId = created.id;

    const [converted] = await staff().inquiries.list({ status: "converted" });
    expect(converted?.convertedPilgrimId).toBe(pilgrimId);
  });

  it("finds the pilgrim by reference, phone, passport and name", async () => {
    const [byRef] = await staff().pilgrims.search({ q: "fa-26-000001" });
    const [byPhone] = await staff().pilgrims.search({ q: "+880 1712 345678" });
    const [byPassport] = await staff().pilgrims.search({ q: "A01234567" });
    const [byName] = await staff().pilgrims.search({ q: "abdul" });
    const missing = await staff().pilgrims.search({ q: "Z99999999" });
    expect(missing).toHaveLength(0);
    for (const hit of [byRef, byPhone, byPassport, byName]) expect(hit?.id).toBe(pilgrimId);
  });

  it("never stores the passport number in clear text", async () => {
    const rows = await withTenant(db, { tenantId, userId: ownerId }, (tx) =>
      tx.execute<{ enc: string }>(sql`select passport_number_enc as enc from pilgrims where id = ${pilgrimId}`),
    );
    expect(rows[0]!.enc).not.toContain("A01234567");
    const detail = await staff().pilgrims.get({ id: pilgrimId });
    expect(detail.pilgrim.passportMasked).toBe("A0•••••67");
  });

  it("warns before registering the same passport twice", async () => {
    await expect(
      staff().pilgrims.create({ fullName: "Copy", phone: "01812345678", packageId, passportNumber: "A01234567" }),
    ).rejects.toThrow(/DUPLICATE_PASSPORT:FA-\d{2}-000001/);
  });

  it("lets only admins and accountants reveal the passport, and logs it", async () => {
    await expect(staff().pilgrims.revealPassport({ id: pilgrimId })).rejects.toThrow(/FORBIDDEN/);
    const { passportNumber } = await owner().pilgrims.revealPassport({ id: pilgrimId });
    expect(passportNumber).toBe("A01234567");
    const logs = await withTenant(db, { tenantId, userId: ownerId }, (tx) =>
      tx.execute(sql`select 1 from audit_log where action = 'REVEAL_PASSPORT' and row_id = ${pilgrimId}`),
    );
    expect(logs).toHaveLength(1);
  });

  it("receives payments, posts the ledger and tracks what is due", async () => {
    const first = await staff().payments.receive({ pilgrimId, amount: "2,00,000", method: "cash" });
    expect(first.receiptNo).toMatch(/^MR-\d{2}-000001$/);
    expect(first.totals).toEqual({ paid: 2_00_000_00, discount: 10_000_00, due: 4_40_000_00, overpaid: 0 });

    await expect(staff().payments.receive({ pilgrimId, amount: "500", method: "bkash" })).rejects.toThrow(
      /REFERENCE_REQUIRED/,
    );
    const second = await staff().payments.receive({ pilgrimId, amount: "50000.50", method: "bkash", reference: "TRX1" });
    expect(second.totals.due).toBe(3_89_999_50);
  });

  it("prints a receipt with totals as of that receipt", async () => {
    const [latest, earlier] = await staff().payments.recent({ limit: 2 });
    const receipt = await staff().payments.receipt({ id: earlier!.id });
    expect(receipt.agency.legalName).toBe("Flow Agency Ltd");
    expect(receipt.totals.paid).toBe(2_00_000_00);
    const second = await staff().payments.receipt({ id: latest!.id });
    expect(second.totals.paid).toBe(2_50_000_50);
  });

  it("refuses to take more than is due unless told to", async () => {
    await expect(staff().payments.receive({ pilgrimId, amount: "4,00,000", method: "cash" })).rejects.toThrow(
      /OVERPAYMENT:38999950/,
    );
  });

  it("hands out unique receipt numbers under concurrent payments", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => staff().payments.receive({ pilgrimId, amount: "1000", method: "cash" })),
    );
    const numbers = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.receiptNo] : []));
    expect(numbers).toHaveLength(10);
    expect(new Set(numbers).size).toBe(10);
    const detail = await staff().pilgrims.get({ id: pilgrimId });
    expect(detail.totals.paid).toBe(2_00_000_00 + 50_000_50 + 10 * 1_000_00);
  });

  it("voids a receipt with a reversing ledger entry; the ledger still balances", async () => {
    const [latest] = await staff().payments.recent({ limit: 1 });
    await expect(staff().payments.void({ id: latest!.id, reason: "typing mistake" })).rejects.toThrow(/FORBIDDEN/);
    await owner().payments.void({ id: latest!.id, reason: "typing mistake" });
    await expect(owner().payments.void({ id: latest!.id, reason: "again" })).rejects.toThrow(/ALREADY_VOID/);

    const detail = await staff().pilgrims.get({ id: pilgrimId });
    const ledger = await withTenant(db, { tenantId, userId: ownerId }, (tx) => tx.select().from(ledgerEntries));
    const net = ledger.reduce((a, e) => a + (e.direction === "in" ? e.amount : -e.amount), 0);
    expect(net).toBe(detail.totals.paid);
  });

  it("blocks edits to a payment's amount even through raw SQL", async () => {
    const error = await withTenant(db, { tenantId, userId: ownerId }, (tx) =>
      tx.execute(sql`update payments set amount = 1`),
    ).catch((e: Error & { cause?: Error }) => e);
    expect(String((error as Error & { cause?: Error }).cause?.message)).toMatch(/PAYMENT_IMMUTABLE/);
  });

  it("verifies a receipt publicly by token only", async () => {
    const [p] = await withTenant(db, { tenantId, userId: ownerId }, (tx) =>
      tx.execute<{ verify_token: string }>(sql`select verify_token from payments order by received_at limit 1`),
    );
    const [found] = await db.execute<{ receipt_no: string; agency: string }>(
      sql`select * from verify_receipt(${p!.verify_token})`,
    );
    expect(found?.agency).toBe("Flow Agency Ltd");
    const none = await db.execute(sql`select * from verify_receipt('short')`);
    expect(none).toHaveLength(0);
  });

  it("keeps other agencies out", async () => {
    await expect(outsider().pilgrims.get({ id: pilgrimId })).rejects.toThrow(/FORBIDDEN/);
  });
});
