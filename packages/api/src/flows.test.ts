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
const platformAdminId = randomUUID();
const staffId = randomUUID();

const owner = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: tenantId } }));
const staff = () => createCaller(createContext({ session: { userId: staffId, activeOrganizationId: tenantId } }));
const outsider = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: otherTenantId } }));
const platform = () => createCaller(createContext({ session: { userId: platformAdminId, activeOrganizationId: null } }));

let packageId: string;
let pilgrimId: string;

beforeAll(async () => {
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: `${ownerId}@test.local` },
    { id: staffId, name: "Staff", email: `${staffId}@test.local` },
    { id: platformAdminId, name: "Platform", email: `${platformAdminId}@test.local` },
  ]);
  const { default: pg } = await import("postgres");
  const ownerDb = pg(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`insert into platform_admins (user_id) values (${platformAdminId})`;
  await ownerDb.end();
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
  await ownerDb`delete from plans where code like 'tiny%'`;
  await ownerDb`delete from "user" where id in (${ownerId}, ${staffId}, ${platformAdminId})`;
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

  it("collects papers and will not finalise a pilgrim until they are complete", async () => {
    // A fully paid Umrah pilgrim with a valid passport, missing papers.
    const umrah = await owner().packages.create({ kind: "umrah", name: "Umrah", season: "1448", price: "1,00,000" });
    const p = await staff().pilgrims.create({
      fullName: "Doc Test",
      phone: "01911111111",
      packageId: umrah.id,
      passportNumber: "B12345678",
      passportExpiry: "2032-01-01",
      dateOfBirth: "1980-02-02",
      gender: "male",
      nidNumber: "১২৩৪৫৬৭৮৯০",
    });
    await staff().payments.receive({ pilgrimId: p.id, amount: "100000", method: "cash" });

    const [byNid] = await staff().pilgrims.search({ q: "1234567890" });
    expect(byNid?.id).toBe(p.id);

    let detail = await staff().pilgrims.get({ id: p.id });
    expect(detail.pilgrim.nidMasked).toBe("••••••7890");
    expect(detail.readiness.issues.map((i) => ("code" in i ? i.code : i.kind))).toEqual([
      "photo",
      "passport",
      "nid",
      "vaccination",
    ]);
    await expect(staff().pilgrims.setStatus({ id: p.id, status: "ready" })).rejects.toThrow(/NOT_READY:4/);

    const key = (n: string) => `tenants/${tenantId}/pilgrims/${p.id}/${n}.enc`;
    await expect(
      staff().documents.attach({ pilgrimId: p.id, type: "photo", key: key("x"), contentType: "application/pdf", sizeBytes: 10 }),
    ).rejects.toThrow(/UNSUPPORTED_TYPE/);
    await expect(
      staff().documents.attach({ pilgrimId: p.id, type: "photo", key: "tenants/other/x.enc", contentType: "image/png", sizeBytes: 10 }),
    ).rejects.toThrow();
    for (const type of ["photo", "passport", "nid", "vaccination"]) {
      const doc = await staff().documents.attach({ pilgrimId: p.id, type, key: key(type), contentType: "image/jpeg", sizeBytes: 1000 });
      await staff().documents.review({ id: doc.id, status: "verified", expiresOn: type === "vaccination" ? "2029-01-01" : undefined });
    }
    await expect(staff().documents.review({ id: (await staff().pilgrims.get({ id: p.id })).documents[0]!.id, status: "rejected" })).rejects.toThrow(
      /REASON_REQUIRED/,
    );

    detail = await staff().pilgrims.get({ id: p.id });
    expect(detail.readiness).toEqual({ ready: true, issues: [] });
    expect(detail.pilgrim.hasPhoto).toBe(true);
    await staff().pilgrims.setStatus({ id: p.id, status: "ready" });
  });

  it("lets only owners and admins override readiness, with a logged reason", async () => {
    const [pkg] = await owner().packages.list({ activeOnly: true });
    const p = await staff().pilgrims.create({ fullName: "Override Test", phone: "01922222222", packageId: pkg!.id });
    await expect(staff().pilgrims.setStatus({ id: p.id, status: "ready", overrideReason: "urgent group" })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await owner().pilgrims.setStatus({ id: p.id, status: "ready", overrideReason: "papers held by the ministry" });
    const logs = await withTenant(db, { tenantId, userId: ownerId }, (tx) =>
      tx.execute(sql`select 1 from audit_log where row_id = ${p.id} and action like 'OVERRIDE_READY:%'`),
    );
    expect(logs).toHaveLength(1);
  });

  it("adds the starter guide once, as drafts", async () => {
    expect((await staff().articles.addStarter()).added).toBe(7);
    expect((await staff().articles.addStarter()).added).toBe(0);
    const list = await staff().articles.list();
    expect(list).toHaveLength(7);
    expect(list.every((a) => !a.published)).toBe(true);
  });

  it("lets only admins and scholars approve religious content", async () => {
    await expect(
      staff().sacred.review({ contentId: "item:dua_talbiyah", status: "approved" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(owner().sacred.review({ contentId: "item:nope", status: "approved" })).rejects.toThrow(/NOT_FOUND/);
    await expect(
      owner().sacred.review({ contentId: "item:surah_ikhlas", status: "approved", meaningBn: ["one line only"] }),
    ).rejects.toThrow(/MEANING_COUNT/);
    await owner().sacred.review({ contentId: "item:dua_talbiyah", status: "approved", reviewerNote: "checked" });
    const reviews = await staff().sacred.reviews();
    expect(reviews["item:dua_talbiyah"]?.status).toBe("approved");
    expect(await outsider().sacred.reviews().catch((e: Error) => e.message)).toMatch(/FORBIDDEN/);
  });

  it("starts every new agency on a trial", async () => {
    const sub = await staff().tenant.subscription();
    expect(sub?.status).toBe("trial");
    expect(sub?.inactive).toBe(false);
  });

  it("shows the platform overview only to platform admins", async () => {
    expect((await owner().platform.me()).isAdmin).toBe(false);
    await expect(owner().platform.overview()).rejects.toThrow(/FORBIDDEN/);
    expect((await platform().platform.me()).isAdmin).toBe(true);
    const overview = await platform().platform.overview();
    expect(overview.agencies).toBeGreaterThan(0);
    const agencies = await platform().platform.agencies();
    const mine = agencies.find((a) => a.id === tenantId);
    expect(mine?.name).toBe("Flow Agency Ltd");
    expect(mine?.pilgrims).toBeGreaterThan(0);
    expect(mine?.status).toBe("trial");
  });

  it("enforces the plan's pilgrim limit", async () => {
    const plans = await platform().platform.plans();
    const tiny = await platform().platform.savePlan({
      code: `tiny${Date.now()}`.slice(0, 20),
      nameBn: "ছোট",
      nameEn: "Tiny",
      priceMonthly: "100",
      priceYearly: "1000",
      pilgrimsPerYear: 1,
      staffSeats: 1,
      smsPerMonth: 0,
      units: ["hajj"],
      customDomain: false,
      sortOrder: 99,
      active: false,
    });
    await platform().platform.setSubscription({
      tenantId, planId: tiny.id, status: "active", cycle: "monthly", trialEndsAt: null, currentPeriodEnd: "2030-01-01",
    });
    const [pkg] = await owner().packages.list({ activeOnly: true });
    await expect(staff().pilgrims.create({ fullName: "Over Limit", phone: "01933333333", packageId: pkg!.id })).rejects.toThrow(
      /PLAN_LIMIT:1/,
    );
    const premium = plans.find((p) => p.code === "premium")!;
    await platform().platform.setSubscription({
      tenantId, planId: premium.id, status: "active", cycle: "yearly", trialEndsAt: null, currentPeriodEnd: "2030-01-01",
    });
  });

  it("makes a suspended agency read-only", async () => {
    const premium = (await platform().platform.plans()).find((p) => p.code === "premium")!;
    await platform().platform.setSubscription({
      tenantId, planId: premium.id, status: "suspended", cycle: "monthly", trialEndsAt: null, currentPeriodEnd: null, notes: "unpaid",
    });
    expect((await staff().tenant.subscription())?.inactive).toBe(true);
    await expect(staff().inquiries.create({ name: "Blocked", phone: "01944444444", interest: "hajj" })).rejects.toThrow(
      /SUBSCRIPTION_INACTIVE/,
    );
    expect((await staff().pilgrims.list()).length).toBeGreaterThan(0);
    await platform().platform.setSubscription({
      tenantId, planId: premium.id, status: "active", cycle: "monthly", trialEndsAt: null, currentPeriodEnd: "2030-01-01",
    });
    await staff().inquiries.create({ name: "Allowed again", phone: "01944444444", interest: "hajj" });
  });

  it("keeps other agencies out", async () => {
    await expect(outsider().pilgrims.get({ id: pilgrimId })).rejects.toThrow(/FORBIDDEN/);
  });
});
