import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql, withTenant } from "@hajj/db";
import { member, organization, smsMessages, user } from "@hajj/db/schema";
import { appRouter } from "./root";
import { createCallerFactory, createContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const a = { tenant: randomUUID(), owner: randomUUID(), staff: randomUUID() };
const b = { tenant: randomUUID(), owner: randomUUID() };
const as = (userId: string, tenantId: string) => createCaller(createContext({ session: { userId, activeOrganizationId: tenantId } }));
const ownerA = () => as(a.owner, a.tenant);
const staffA = () => as(a.staff, a.tenant);
const ownerB = () => as(b.owner, b.tenant);
const planCode = `tinysms-${a.tenant.slice(0, 6)}`;
let packageId: string;

async function ownerSql() {
  const { default: postgres } = await import("postgres");
  return postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
}

beforeAll(async () => {
  process.env.SMS_TRANSPORT = "file";
  await db.insert(user).values([
    { id: a.owner, name: "Owner A", email: `${a.owner}@test.local` },
    { id: a.staff, name: "Staff A", email: `${a.staff}@test.local` },
    { id: b.owner, name: "Owner B", email: `${b.owner}@test.local` },
  ]);
  await db.insert(organization).values([
    { id: a.tenant, name: "SMS A", slug: `sms-a-${a.tenant.slice(0, 8)}`, createdAt: new Date() },
    { id: b.tenant, name: "SMS B", slug: `sms-b-${b.tenant.slice(0, 8)}`, createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: randomUUID(), organizationId: a.tenant, userId: a.owner, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: a.tenant, userId: a.staff, role: "staff", createdAt: new Date() },
    { id: randomUUID(), organizationId: b.tenant, userId: b.owner, role: "owner", createdAt: new Date() },
  ]);
  await ownerA().tenant.initialize({ organizationId: a.tenant, legalName: "Noor Travels", referencePrefix: "NR", defaultLocale: "bn", enabledUnits: ["hajj", "office"] });
  await ownerB().tenant.initialize({ organizationId: b.tenant, legalName: "Other Travels", referencePrefix: "OT", defaultLocale: "bn", enabledUnits: ["hajj", "office"] });
  packageId = (await ownerA().packages.create({ kind: "hajj", name: "Standard", season: "1448", price: "6,85,000" })).id;
});

afterAll(async () => {
  const sql = await ownerSql();
  await sql`delete from organization where id in (${a.tenant}, ${b.tenant})`;
  await sql`delete from "user" where id in (${a.owner}, ${a.staff}, ${b.owner})`;
  await sql`delete from plans where code = ${planCode}`;
  await sql.end();
  await rawSql.end();
});

describe("payment texts", () => {
  it("queues a text with the amount, receipt number, due and check link when money is taken", async () => {
    const pilgrim = await staffA().pilgrims.create({ fullName: "Abdul Karim", phone: "01712345678", packageId, passportNumber: `A${Date.now().toString().slice(-8)}` });
    const paid = await staffA().payments.receive({ pilgrimId: pilgrim.id, amount: "50,000", method: "cash" });
    expect(paid.sms).toBe("queued");
    expect(paid).not.toHaveProperty("verifyToken");
    const [{ receipts }] = [await ownerA().sms.overview()];
    expect(receipts[0]).toMatchObject({ toPhone: "+8801712345678", status: "queued" });
    expect(receipts[0]!.body).toContain(paid.receiptNo);
    expect(receipts[0]!.body).toContain("৳৫০,০০০ জমা হয়েছে");
    expect(receipts[0]!.body).toMatch(/বাকি ৳৬,৩৫,০০০।/);
    expect(receipts[0]!.body).toMatch(/\/verify\/[A-Za-z0-9_-]{20,}$/);
  });

  it("sends nothing when the agency turns payment texts off", async () => {
    await expect(staffA().sms.setReceipts({ on: false })).rejects.toThrow(/FORBIDDEN/);
    await ownerA().sms.setReceipts({ on: false });
    const pilgrim = await staffA().pilgrims.create({ fullName: "Rahima Begum", phone: "01812345678", packageId, passportNumber: `B${Date.now().toString().slice(-8)}` });
    expect((await staffA().payments.receive({ pilgrimId: pilgrim.id, amount: "1,000", method: "cash" })).sms).toBe("off");
    await ownerA().sms.setReceipts({ on: true });
  });

  it("keeps a message as not sent when SMS isn't set up on the server", async () => {
    delete process.env.SMS_TRANSPORT;
    try {
      const pilgrim = await staffA().pilgrims.create({ fullName: "Karim Mia", phone: "01912345678", packageId, passportNumber: `C${Date.now().toString().slice(-8)}` });
      expect((await staffA().payments.receive({ pilgrimId: pilgrim.id, amount: "1,000", method: "cash" })).sms).toBe("skipped");
      expect((await ownerA().sms.overview()).receipts[0]).toMatchObject({ status: "skipped", error: "SMS is not set up on this server" });
      await expect(ownerA().sms.sendNotice({ group: "all", text: "মিটিং শুক্রবার" })).rejects.toThrow(/SMS_OFF/);
    } finally {
      process.env.SMS_TRANSPORT = "file";
    }
  });
});

describe("notices", () => {
  it("counts each number once and sends to the chosen group", async () => {
    expect((await ownerA().sms.audience({ group: "all" })).recipients).toBe(3);
    expect((await ownerA().sms.audience({ group: "package", packageId })).recipients).toBe(3);
    expect((await ownerA().sms.audience({ group: "status", status: "visa" })).recipients).toBe(0);
    await expect(staffA().sms.sendNotice({ group: "all", text: "মিটিং শুক্রবার" })).rejects.toThrow(/FORBIDDEN/);
    const sent = await ownerA().sms.sendNotice({ group: "all", text: "আসসালামু আলাইকুম। হজের মিটিং শুক্রবার বিকেল ৪টায় অফিসে।" });
    expect(sent).toMatchObject({ recipients: 3, queued: 3, skipped: 0, parts: 1 });
    const [batch] = (await ownerA().sms.overview()).batches;
    expect(batch).toMatchObject({ batchId: sent.batchId, total: 3 });
  });

  it("refuses a notice the month's allowance can't cover, and counts parts", async () => {
    const sql = await ownerSql();
    await sql`insert into plans (code, name_bn, name_en, price_monthly, price_yearly, limits, units) values (${planCode}, 'ছোট', 'Tiny', 100, 1000, ${sql.json({ staffSeats: 3, smsPerMonth: 8, pilgrimsPerYear: null })}, '{hajj,office}')`;
    await sql`update subscriptions set plan_id = (select id from plans where code = ${planCode}) where tenant_id = ${a.tenant}`;
    await sql.end();
    const quota = (await ownerA().sms.overview()).quota;
    // The payment text is two Bangla parts, the notice one part to each of three numbers; skipped ones don't count.
    expect(quota).toMatchObject({ limit: 8, used: 5, remaining: 3 });
    // Two parts each for three numbers is 6, more than the 3 left.
    await expect(ownerA().sms.sendNotice({ group: "all", text: "ক".repeat(100) })).rejects.toThrow(/SMS_LIMIT:3/);
  });
});

describe("isolation", () => {
  it("shows an agency only its own messages, and the app can't rewrite history", async () => {
    const other = await ownerB().sms.overview();
    expect(other.receipts).toHaveLength(0);
    expect(other.batches).toHaveLength(0);
    await expect(
      withTenant(db, { tenantId: a.tenant, userId: a.owner }, (tx) => tx.update(smsMessages).set({ status: "sent" }).where(eq(smsMessages.kind, "notice"))),
    ).rejects.toThrow();
  });
});
