import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { outstanding, readiness } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { payments, pilgrimDocuments, pilgrims, travelPackages } from "@hajj/db/schema";
import { businessDate, getSettings } from "./tenant";

/** Readiness to finalise, computed from the pilgrim's record, papers and payments. */
export async function pilgrimReadiness(tx: Transaction, pilgrimId: string) {
  const [row] = await tx
    .select({ p: pilgrims, kind: travelPackages.kind })
    .from(pilgrims)
    .leftJoin(travelPackages, eq(travelPackages.id, pilgrims.packageId))
    .where(eq(pilgrims.id, pilgrimId));
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });

  const docs = await tx
    .select({ code: pilgrimDocuments.type, status: pilgrimDocuments.status, expiresOn: pilgrimDocuments.expiresOn })
    .from(pilgrimDocuments)
    .where(eq(pilgrimDocuments.pilgrimId, pilgrimId))
    .orderBy(asc(pilgrimDocuments.uploadedAt));
  const paid = await tx
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.pilgrimId, pilgrimId), isNull(payments.voidedAt)));
  const totals = outstanding(row.p.packagePrice, paid.map((x) => x.amount), [row.p.discount]);
  const settings = await getSettings(tx);
  const today = businessDate(settings);

  return readiness(
    {
      kind: row.kind ?? "hajj",
      gender: row.p.gender,
      dateOfBirth: row.p.dateOfBirth,
      documents: docs,
      hasPassportNumber: Boolean(row.p.passportNumberEnc),
      passportExpiry: row.p.passportExpiry,
      due: totals.due,
      prpNumber: row.p.prpNumber,
    },
    today,
  );
}
