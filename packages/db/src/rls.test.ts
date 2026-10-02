import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql, withTenant } from "./index";
import { counters, ledgerEntries, organization, tenantSettings } from "./schema";

const tenantA = randomUUID();
const tenantB = randomUUID();
const userId = "test-user";

function entry(amount: number) {
  return {
    unit: "hajj" as const,
    direction: "in" as const,
    amount,
    currency: "BDT" as const,
    businessDate: "2026-10-02",
    sourceType: "test",
    sourceId: randomUUID(),
  };
}

beforeAll(async () => {
  await db.insert(organization).values([
    { id: tenantA, name: "Agency A", slug: `a-${tenantA}`, createdAt: new Date() },
    { id: tenantB, name: "Agency B", slug: `b-${tenantB}`, createdAt: new Date() },
  ]);
  await withTenant(db, { tenantId: tenantA, userId }, (tx) =>
    tx.insert(tenantSettings).values({ tenantId: tenantA, legalName: "Agency A Ltd" }),
  );
  await withTenant(db, { tenantId: tenantB, userId }, (tx) =>
    tx.insert(tenantSettings).values({ tenantId: tenantB, legalName: "Agency B Ltd" }),
  );
});

afterAll(async () => {
  // Cleanup as the owner: the app role cannot delete ledger rows by design.
  const { default: postgres } = await import("postgres");
  const owner = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await owner`delete from organization where id in (${tenantA}, ${tenantB})`;
  await owner.end();
  await rawSql.end();
});

describe("row level security", () => {
  it("hides other tenants' rows", async () => {
    await withTenant(db, { tenantId: tenantA, userId }, (tx) => tx.insert(ledgerEntries).values(entry(500_00)));
    await withTenant(db, { tenantId: tenantB, userId }, (tx) => tx.insert(ledgerEntries).values(entry(900_00)));

    const seenByA = await withTenant(db, { tenantId: tenantA, userId }, (tx) => tx.select().from(ledgerEntries));
    expect(seenByA.map((r) => r.amount)).toEqual([500_00]);

    const settingsSeenByB = await withTenant(db, { tenantId: tenantB, userId }, (tx) =>
      tx.select().from(tenantSettings),
    );
    expect(settingsSeenByB.map((s) => s.legalName)).toEqual(["Agency B Ltd"]);
  });

  it("returns nothing without a tenant context", async () => {
    const rows = await db.select().from(ledgerEntries);
    expect(rows).toHaveLength(0);
  });

  it("refuses to write a row for another tenant", async () => {
    await expect(
      withTenant(db, { tenantId: tenantA, userId }, (tx) =>
        tx.insert(ledgerEntries).values({ ...entry(1_00), tenantId: tenantB }),
      ),
    ).rejects.toThrow();
  });

  it("keeps the ledger append-only", async () => {
    await expect(
      withTenant(db, { tenantId: tenantA, userId }, (tx) =>
        tx.update(ledgerEntries).set({ amount: 1 }).where(eq(ledgerEntries.tenantId, tenantA)),
      ),
    ).rejects.toThrow();
  });

  it("records ledger inserts in the audit log with the acting user", async () => {
    const rows = await withTenant(db, { tenantId: tenantA, userId }, (tx) =>
      tx.execute<{ actor_id: string }>(sql`select actor_id from audit_log where table_name = 'ledger_entries'`),
    );
    expect(rows.map((r) => r.actor_id)).toEqual([userId]);
  });
});

describe("reference counters", () => {
  it("hands out unique, gap-free numbers under concurrency", async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        withTenant(db, { tenantId: tenantA, userId }, async (tx) => {
          const [row] = await tx.execute<{ n: number }>(sql`select next_reference('pilgrim', 2026) as n`);
          return row!.n;
        }),
      ),
    );
    expect([...results].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

    const other = await withTenant(db, { tenantId: tenantB, userId }, async (tx) => {
      const [row] = await tx.execute<{ n: number }>(sql`select next_reference('pilgrim', 2026) as n`);
      return row!.n;
    });
    expect(other).toBe(1);
  });

  it("fails when no tenant is set", async () => {
    await expect(db.execute(sql`select next_reference('pilgrim', 2026)`)).rejects.toThrow();
    const leftovers = await db.select().from(counters);
    expect(leftovers).toHaveLength(0);
  });
});
