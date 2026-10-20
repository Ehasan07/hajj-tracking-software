import { randomUUID } from "node:crypto";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql } from "@hajj/db";
import { member, organization, session, user } from "@hajj/db/schema";
import { describeError, publicReason } from "./errors";
import { appRouter } from "./root";
import { containing, isPilgrimFileKey } from "./routers/shared";
import { createCallerFactory, createContext, publicProcedure, router, subscriptionInactive } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const tenantId = randomUUID();
const ownerId = randomUUID();
const staffId = randomUUID();
const owner = () => createCaller(createContext({ session: { userId: ownerId, activeOrganizationId: tenantId } }));

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
  ]);
  await db.insert(organization).values({ id: tenantId, name: "Sec Agency", slug: `sec-${tenantId}`, createdAt: new Date() });
  await db.insert(member).values([
    { id: randomUUID(), organizationId: tenantId, userId: ownerId, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: tenantId, userId: staffId, role: "staff", createdAt: new Date() },
  ]);
  await owner().tenant.initialize({
    organizationId: tenantId,
    legalName: "Sec Agency Ltd",
    referencePrefix: "SA",
    defaultLocale: "bn",
    enabledUnits: ["hajj", "office"],
  });
});

afterAll(async () => {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`delete from organization where id = ${tenantId}`;
  await ownerDb`delete from "user" where id in (${ownerId}, ${staffId})`;
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
  });
});
