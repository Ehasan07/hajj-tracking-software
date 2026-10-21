import { randomUUID } from "node:crypto";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql } from "@hajj/db";
import { account, member, organization, session, user } from "@hajj/db/schema";
import { describeError, publicReason } from "./errors";
import { appRouter } from "./root";
import { containing, isPilgrimFileKey } from "./routers/shared";
import { createCallerFactory, createContext, publicProcedure, router, subscriptionInactive } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const tenantId = randomUUID();
const ownerId = randomUUID();
const staffId = randomUUID();
const leaverId = randomUUID();
const owner = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: tenantId } }));
const staff = () => createCaller(createContext({ session: { userId: staffId, activeOrganizationId: tenantId } }));
const leaver = () => createCaller(createContext({ session: { userId: leaverId, activeOrganizationId: tenantId } }));

/** Rows of the audit trail for one record that still say what the record held. */
async function auditCopies(table: string, rowId: string) {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  const rows = await ownerDb<{ before: unknown; after: unknown; action: string }[]>`
    select before, after, action from audit_log where tenant_id = ${tenantId} and table_name = ${table} and row_id = ${rowId}`;
  await ownerDb.end();
  return rows;
}

/** Personal data bound into a query that fails, as a real insert's values would be. */
const PII = "Rahima Begum 01711223344";

/** Procedures that hit real database errors, to see what a browser would be sent. */
const failing = router({
  query: publicProcedure.query(() => db.execute(sql`select 1 / 0 where ${PII}::text is not null`)),
  trigger: publicProcedure.query(() =>
    db.execute(sql`do $$ begin raise exception 'PAYMENT_IMMUTABLE' using errcode = 'check_violation'; end $$`),
  ),
});

async function over(path: "query" | "trigger") {
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(`http://localhost/api/trpc/${path}`),
    router: failing,
    createContext: () => createContext({ session: null }),
  });
  return { status: res.status, body: await res.text() };
}

beforeAll(async () => {
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: `${ownerId}@test.local` },
    { id: staffId, name: "Staff", email: `${staffId}@test.local` },
    { id: leaverId, name: "Leaving Staff", email: `${leaverId}@test.local` },
  ]);
  await db.insert(account).values({
    id: randomUUID(),
    accountId: leaverId,
    providerId: "credential",
    userId: leaverId,
    password: await hashPassword("Leaver-Pass-2026!"),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.insert(organization).values({ id: tenantId, name: "Sec Agency", slug: `sec-${tenantId}`, createdAt: new Date() });
  await db.insert(member).values([
    { id: randomUUID(), organizationId: tenantId, userId: ownerId, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: tenantId, userId: staffId, role: "staff", createdAt: new Date() },
    { id: randomUUID(), organizationId: tenantId, userId: leaverId, role: "staff", createdAt: new Date() },
  ]);
  await owner().tenant.initialize({
    organizationId: tenantId,
    legalName: "Sec Agency Ltd",
    referencePrefix: "SA",
    defaultLocale: "bn",
    enabledUnits: ["hajj", "office", "medicine"],
  });
});

afterAll(async () => {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`delete from payments where tenant_id = ${tenantId}`;
  await ownerDb`delete from organization where id = ${tenantId}`;
  await ownerDb`delete from "user" where id in (${ownerId}, ${staffId}, ${leaverId})`;
  await ownerDb.end();
  await rawSql.end();
});

describe("errors sent to the browser", () => {
  it("never carry the failed SQL or its values, only a code and a reference", async () => {
    const { status, body } = await over("query");
    expect(status).toBe(500);
    expect(body).not.toContain("Rahima");
    expect(body).not.toContain("01711223344");
    expect(body).not.toMatch(/select|Failed query|division/i);
    expect(body).not.toMatch(/stack|node_modules|\.ts:/);
    expect(body).toContain('"message":"INTERNAL"');
    expect(body).toMatch(/"ref":"[0-9a-f]{10}"/);
  });

  it("pass on a database rule's own code, so the form can say what happened", async () => {
    const { body } = await over("trigger");
    expect(body).toContain('"message":"PAYMENT_IMMUTABLE"');
  });

  it("are logged without the values either", async () => {
    const error = await db.execute(sql`select 1 / 0 where ${PII}::text is not null`).catch((e: unknown) => e);
    const line = describeError(error);
    expect(line).toContain("pg=22012");
    expect(line).not.toContain("Rahima");
    expect(line).not.toContain("select");
    expect(publicReason(error)).toBeNull();
  });
});

describe("money decisions belong to managers", () => {
  it("lets only owners, admins and accountants give discounts, change prices or take more than is due", async () => {
    const pkg = await owner().packages.create({ kind: "umrah", name: "Umrah", season: "1448", price: "1,00,000" });
    await expect(
      staff().pilgrims.create({ fullName: "Discount Try", phone: "01811111111", packageId: pkg.id, discount: "5000" }),
    ).rejects.toThrow(/DISCOUNT_NOT_ALLOWED/);
    const p = await staff().pilgrims.create({ fullName: "Full Price", phone: "01811111112", packageId: pkg.id });
    await expect(
      staff().payments.receive({ pilgrimId: p.id, amount: "200000", method: "cash", allowOverpayment: true }),
    ).rejects.toThrow(/OVERPAYMENT_NOT_ALLOWED/);

    await expect(staff().shop.saveProduct({ unit: "medicine", name: "Napa", price: "10", trackStock: false })).rejects.toThrow(/FORBIDDEN/);
    const napa = await owner().shop.saveProduct({ unit: "medicine", name: "Napa", price: "10", trackStock: false });
    await expect(
      staff().shop.sell({ unit: "medicine", items: [{ productId: napa.id, qty: 1, unitPrice: "0" }] }),
    ).rejects.toThrow(/PRICE_LOCKED/);
    await expect(
      staff().shop.sell({ unit: "medicine", items: [{ productId: napa.id, qty: 2 }], discount: "5" }),
    ).rejects.toThrow(/DISCOUNT_NOT_ALLOWED/);
    const sale = await staff().shop.sell({ unit: "medicine", items: [{ productId: napa.id, qty: 2 }] });
    expect(sale.totals.total).toBe(20_00);
  });
});

describe("erasing personal data on request", () => {
  it("erases a pilgrim's details, papers and audit copies, and keeps the money", async () => {
    const pkg = await owner().packages.create({ kind: "hajj", name: "Hajj", season: "1448", price: "6,00,000" });
    const p = await staff().pilgrims.create({
      fullName: "Rahima Khatun",
      fatherName: "Abdul Hamid",
      phone: "01722334455",
      packageId: pkg.id,
      passportNumber: "B98765432",
      passportExpiry: "2032-01-01",
      dateOfBirth: "1970-05-05",
      nidNumber: "1234567890123",
    });
    // The trail never holds encrypted ID numbers or their search keys.
    const [inserted] = await auditCopies("pilgrims", p.id);
    expect(Object.keys(inserted!.after as object)).not.toContain("passport_number_enc");
    expect(Object.keys(inserted!.after as object)).not.toContain("nid_index");

    const pay = await staff().payments.receive({ pilgrimId: p.id, amount: "50000", method: "cash" });
    const key = `tenants/${tenantId}/pilgrims/${p.id}/photo-${randomUUID()}.jpg.enc`;
    await staff().documents.attach({ pilgrimId: p.id, type: "photo", key, contentType: "image/jpeg", sizeBytes: 1000 });

    await expect(staff().pilgrims.erase({ id: p.id, confirmRef: p.ref })).rejects.toThrow(/FORBIDDEN/);
    await expect(owner().pilgrims.erase({ id: p.id, confirmRef: "WRONG" })).rejects.toThrow(/CONFIRM_MISMATCH/);
    const { fileKeys } = await owner().pilgrims.erase({ id: p.id, confirmRef: p.ref.toLowerCase() });
    expect(fileKeys).toEqual([key]);

    const after = await owner().pilgrims.get({ id: p.id });
    expect(after.pilgrim.fullName).toBe("—");
    expect(after.pilgrim.phone).toBe("");
    expect(after.pilgrim.fatherName).toBeNull();
    expect(after.pilgrim.dateOfBirth).toBeNull();
    expect(after.pilgrim.passportMasked).toBeNull();
    expect(after.pilgrim.erasedAt).toBeInstanceOf(Date);
    expect(after.documents).toHaveLength(0);
    expect(after.payments.map((x) => x.id)).toEqual([pay.id]);
    expect(await owner().pilgrims.search({ q: "B98765432" })).toHaveLength(0);
    expect(await owner().pilgrims.search({ q: "Rahima" })).toHaveLength(0);

    const copies = await auditCopies("pilgrims", p.id);
    expect(copies.filter((c) => c.before !== null || c.after !== null)).toHaveLength(0);
    expect(copies.map((c) => c.action)).toContain("ERASE_PERSONAL_DATA");
    await expect(owner().pilgrims.update({ id: p.id, fullName: "Back Again" })).rejects.toThrow(/ERASED/);
  });

  it("deletes an inquiry with its audit copies; only owners and admins may", async () => {
    const iq = await staff().inquiries.create({ name: "Kamal Hossain", phone: "01733445566", interest: "umrah" });
    await expect(staff().inquiries.erase({ id: iq.id })).rejects.toThrow(/FORBIDDEN/);
    await owner().inquiries.erase({ id: iq.id });
    expect((await owner().inquiries.list()).map((i) => i.id)).not.toContain(iq.id);
    expect((await auditCopies("inquiries", iq.id)).filter((c) => c.before !== null || c.after !== null)).toHaveLength(0);
  });

  it("erases a shop customer's name from the customer and the ledger, keeping the dues", async () => {
    const c = await owner().shop.saveCustomer({ unit: "medicine", name: "Rafiq Pharmacy", phone: "01744556677", area: "Mirpur" });
    const product = await owner().shop.saveProduct({ unit: "medicine", name: "Seclo", price: "100", trackStock: false });
    await owner().shop.sell({ unit: "medicine", items: [{ productId: product.id, qty: 3 }], customerId: c.id, paid: "0" });
    await owner().shop.collect({ unit: "medicine", customerId: c.id, amount: "100", method: "cash" });

    await expect(staff().shop.eraseCustomer({ unit: "medicine", id: c.id })).rejects.toThrow(/FORBIDDEN/);
    await owner().shop.eraseCustomer({ unit: "medicine", id: c.id });
    const after = await owner().shop.customer({ unit: "medicine", id: c.id });
    expect(after.customer).toMatchObject({ name: "—", phone: null, area: null });
    expect(after.balance).toBe(200_00);
    const memos = await db.execute<{ memo: string }>(sql`
      select memo from ledger_entries where tenant_id = ${tenantId} and memo is not null and strpos(memo, 'Rafiq') > 0`);
    expect(memos).toHaveLength(0);
  });

  it("erases an employee's name from the record and the ledger, keeping the advance", async () => {
    const e = await owner().payroll.saveEmployee({ name: "Jalal Uddin", phone: "01755667788", basic: "15000", allowances: [], accountNo: "017556677" });
    await owner().payroll.giveAdvance({ employeeId: e.id, amount: "2000", method: "cash" });
    await owner().payroll.eraseEmployee({ id: e.id });
    const [row] = (await owner().payroll.employees()).filter((x) => x.id === e.id);
    expect(row).toMatchObject({ name: "—", phone: null, accountNo: null, active: false, advanceDue: 2000_00 });
    const memos = await db.execute<{ memo: string }>(sql`
      select memo from ledger_entries where tenant_id = ${tenantId} and strpos(coalesce(memo, ''), 'Jalal') > 0`);
    expect(memos).toHaveLength(0);
  });

  it("lets a colleague delete their own login after typing the password; an owner can't", async () => {
    await expect(owner().account.deleteMe({ password: "anything" })).rejects.toThrow(/OWNER_CANNOT_DELETE/);
    await expect(leaver().account.deleteMe({ password: "wrong-password" })).rejects.toThrow(/WRONG_PASSWORD/);
    await leaver().account.deleteMe({ password: "Leaver-Pass-2026!" });
    const [u] = await db.select().from(user).where(eq(user.id, leaverId));
    expect(u).toMatchObject({ name: "—", email: `erased-${leaverId}@erased.invalid`, phoneNumber: null });
    expect(await db.select().from(account).where(eq(account.userId, leaverId))).toHaveLength(0);
    expect(await db.select().from(member).where(eq(member.userId, leaverId))).toHaveLength(0);
  });
});

describe("guards", () => {
  it("accepts only file keys the upload route makes", () => {
    const pilgrim = randomUUID();
    const base = `tenants/${tenantId}/pilgrims/${pilgrim}/`;
    expect(isPilgrimFileKey(`${base}passport-${randomUUID()}.jpg.enc`, tenantId, pilgrim, "passport")).toBe(true);
    expect(isPilgrimFileKey(`${base}nid-${randomUUID()}.pdf.enc`, tenantId, pilgrim, "nid")).toBe(true);
    // Another agency's file reached through "..", another kind, another folder, a bare name.
    expect(isPilgrimFileKey(`${base}../../../other/pilgrims/x/passport-${randomUUID()}.jpg.enc`, tenantId, pilgrim, "passport")).toBe(false);
    expect(isPilgrimFileKey(`${base}photo-${randomUUID()}.jpg.enc`, tenantId, pilgrim, "passport")).toBe(false);
    expect(isPilgrimFileKey(`${base}x/passport-${randomUUID()}.jpg.enc`, tenantId, pilgrim, "passport")).toBe(false);
    expect(isPilgrimFileKey(`${base}passport.enc`, tenantId, pilgrim, "passport")).toBe(false);
  });

  it("searches for %, _ and backslash as plain characters", () => {
    expect(containing("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("treats an agency with no subscription as unable to make changes", () => {
    expect(subscriptionInactive(undefined)).toBe(true);
    expect(subscriptionInactive({ status: "active", trialEndsAt: null })).toBe(false);
  });

  it("signs a removed colleague out of the agency at once", async () => {
    await db.insert(session).values({
      id: randomUUID(),
      token: randomUUID(),
      userId: staffId,
      activeOrganizationId: tenantId,
      expiresAt: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    });
    const members = await owner().team.members();
    const target = members.find((m) => m.userId === staffId)!;
    await owner().team.remove({ memberId: target.id });
    const left = await db.select().from(session).where(and(eq(session.userId, staffId), eq(session.activeOrganizationId, tenantId)));
    expect(left).toHaveLength(0);
    // A login that belongs to no other agency is erased with it.
    const [u] = await db.select().from(user).where(eq(user.id, staffId));
    expect(u?.email).toBe(`erased-${staffId}@erased.invalid`);
  });
});
