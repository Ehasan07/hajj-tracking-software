import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  maskPassportNumber,
  normalizeBdPhone,
  normalizePassportNumber,
  outstanding,
  parseAmount,
  parseReference,
} from "@hajj/core";
import type { Transaction } from "@hajj/db";
import { inquiries, payments, pilgrimDocuments, pilgrims, plans, subscriptions, travelPackages } from "@hajj/db/schema";
import { pilgrimReadiness } from "../services/pilgrim";
import { blindIndex, decryptField, encryptField } from "../crypto";
import { getSettings, nextReference } from "../services/tenant";
import { router, tenantProcedure, withRoles } from "../trpc";
import { optionalText, phoneInput } from "./shared";

const pilgrimStatuses = ["registered", "documents", "visa", "ready", "travelled", "completed", "cancelled"] as const;
const FINAL_STATUSES = new Set<string>(["ready", "travelled", "completed"]);

const passportNumberInput = z
  .string()
  .transform(normalizePassportNumber)
  .pipe(z.string().regex(/^[A-Z0-9]{6,12}$/, "INVALID_PASSPORT"));

const profileInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  fatherName: optionalText(120),
  motherName: optionalText(120),
  spouseName: optionalText(120),
  occupation: optionalText(80),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  phone: phoneInput,
  altPhone: z.union([phoneInput, z.literal("").transform(() => undefined)]).optional(),
  email: z.union([z.email(), z.literal("").transform(() => undefined)]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  dateOfBirth: z.iso.date().optional(),
  address: optionalText(500),
  permanentAddress: optionalText(500),
  district: optionalText(60),
  prpNumber: optionalText(40),
  hajjRegNumber: optionalText(40),
  visaNumber: optionalText(40),
  mahramName: optionalText(120),
  mahramRelation: optionalText(60),
  /** Bangladeshi NID: 10, 13 or 17 digits; Bangla digits accepted. */
  nidNumber: z
    .string()
    .transform((v) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, ""))
    .pipe(z.string().regex(/^(\d{10}|\d{13}|\d{17})$/, "INVALID_NID"))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  emergencyName: optionalText(120),
  emergencyPhone: z.union([phoneInput, z.literal("").transform(() => undefined)]).optional(),
  notes: optionalText(2000),
});

function nidColumns(tenantId: string, nid: string | undefined) {
  if (!nid) return {};
  return { nidEnc: encryptField(nid), nidIndex: blindIndex(tenantId, `nid:${nid}`), nidLast4: nid.slice(-4) };
}

function passportColumns(tenantId: string, number: string | undefined) {
  if (!number) return {};
  return {
    passportNumberEnc: encryptField(number),
    passportIndex: blindIndex(tenantId, number),
    passportLast2: number.slice(-2),
  };
}

async function findByPassport(tx: Transaction, index: string, exceptId?: string) {
  const [row] = await tx
    .select({ id: pilgrims.id, ref: pilgrims.ref, fullName: pilgrims.fullName })
    .from(pilgrims)
    .where(and(eq(pilgrims.passportIndex, index), exceptId ? sql`${pilgrims.id} <> ${exceptId}` : undefined))
    .limit(1);
  return row;
}

const listColumns = {
  id: pilgrims.id,
  ref: pilgrims.ref,
  fullName: pilgrims.fullName,
  phone: pilgrims.phone,
  status: pilgrims.status,
  passportLast2: pilgrims.passportLast2,
  passportExpiry: pilgrims.passportExpiry,
  packageName: travelPackages.name,
  packagePrice: pilgrims.packagePrice,
  discount: pilgrims.discount,
  currency: pilgrims.currency,
  paid: sql<number>`coalesce((select sum(p.amount) from payments p where p.pilgrim_id = ${pilgrims.id} and p.voided_at is null), 0)::bigint`.mapWith(Number),
  createdAt: pilgrims.createdAt,
};

export const pilgrimsRouter = router({
  /** One box for everything: reference (HJ-26-000123), mobile number, passport number or name. */
  search: tenantProcedure
    .input(z.object({ q: z.string().trim().min(1).max(80), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const q = input.q;
      const conditions: SQL[] = [];
      const ref = parseReference(q);
      if (ref) conditions.push(eq(pilgrims.ref, q.toUpperCase().trim()));
      const phone = normalizeBdPhone(q);
      if (phone) conditions.push(eq(pilgrims.phone, phone));
      const passport = normalizePassportNumber(q);
      // Any 6–12 character code with at least one digit may be a passport number (formats differ by country).
      if (/^[A-Z0-9]{6,12}$/.test(passport) && /\d/.test(passport) && !phone) {
        conditions.push(eq(pilgrims.passportIndex, blindIndex(ctx.tenantId, passport)));
      }
      const digitsOnly = q.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[\s-]/g, "");
      if (/^(\d{10}|\d{13}|\d{17})$/.test(digitsOnly)) {
        conditions.push(eq(pilgrims.nidIndex, blindIndex(ctx.tenantId, `nid:${digitsOnly}`)));
      }
      if (!ref && q.length >= 2) conditions.push(ilike(pilgrims.fullName, `%${q}%`));
      if (conditions.length === 0) return [];
      return ctx.tx
        .select(listColumns)
        .from(pilgrims)
        .leftJoin(travelPackages, eq(travelPackages.id, pilgrims.packageId))
        .where(or(...conditions))
        .orderBy(desc(pilgrims.createdAt))
        .limit(input.limit);
    }),

  list: tenantProcedure
    .input(
      z
        .object({
          status: z.enum(pilgrimStatuses).optional(),
          packageId: z.uuid().optional(),
          limit: z.number().int().min(1).max(200).default(100),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input?.status) filters.push(eq(pilgrims.status, input.status));
      if (input?.packageId) filters.push(eq(pilgrims.packageId, input.packageId));
      return ctx.tx
        .select(listColumns)
        .from(pilgrims)
        .leftJoin(travelPackages, eq(travelPackages.id, pilgrims.packageId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(pilgrims.createdAt))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);
    }),

  get: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ pilgrim: pilgrims, packageName: travelPackages.name, packageKind: travelPackages.kind })
      .from(pilgrims)
      .leftJoin(travelPackages, eq(travelPackages.id, pilgrims.packageId))
      .where(eq(pilgrims.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });

    const history = await ctx.tx
      .select()
      .from(payments)
      .where(eq(payments.pilgrimId, input.id))
      .orderBy(desc(payments.receivedAt));
    const totals = outstanding(
      row.pilgrim.packagePrice,
      history.filter((p) => !p.voidedAt).map((p) => p.amount),
      [row.pilgrim.discount],
    );

    const { passportNumberEnc, passportIndex: _index, nidEnc, nidIndex: _nid, ...pilgrim } = row.pilgrim;
    const masked = passportNumberEnc ? maskPassportNumber(decryptField(passportNumberEnc)) : null;
    const documents = await ctx.tx
      .select({
        id: pilgrimDocuments.id,
        type: pilgrimDocuments.type,
        contentType: pilgrimDocuments.contentType,
        sizeBytes: pilgrimDocuments.sizeBytes,
        status: pilgrimDocuments.status,
        note: pilgrimDocuments.note,
        expiresOn: pilgrimDocuments.expiresOn,
        uploadedAt: pilgrimDocuments.uploadedAt,
        reviewedAt: pilgrimDocuments.reviewedAt,
      })
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.pilgrimId, input.id))
      .orderBy(desc(pilgrimDocuments.uploadedAt));
    return {
      pilgrim: {
        ...pilgrim,
        passportMasked: masked,
        nidMasked: nidEnc ? `••••••${pilgrim.nidLast4 ?? ""}` : null,
        hasPhoto: documents.some((d) => d.type === "photo" && d.status !== "rejected"),
      },
      packageName: row.packageName,
      packageKind: row.packageKind,
      payments: history.map(({ verifyToken: _t, ...p }) => p),
      totals,
      documents,
      readiness: await pilgrimReadiness(ctx.tx, input.id),
    };
  }),

  create: tenantProcedure
    .input(
      profileInput.extend({
        packageId: z.uuid(),
        discount: z.string().trim().optional(),
        passportNumber: passportNumberInput.optional(),
        passportExpiry: z.iso.date().optional(),
        nationality: z.string().trim().length(3).toUpperCase().optional(),
        inquiryId: z.uuid().optional(),
        /** Set after the user has seen and accepted the duplicate-passport warning. */
        allowDuplicatePassport: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { packageId, discount, passportNumber, allowDuplicatePassport, inquiryId, nidNumber, ...profile } = input;
      const [pkg] = await ctx.tx.select().from(travelPackages).where(eq(travelPackages.id, packageId));
      if (!pkg || !pkg.active) throw new TRPCError({ code: "BAD_REQUEST", message: "PACKAGE_UNAVAILABLE" });

      // Plan limit: pilgrims registered this calendar year.
      const [plan] = await ctx.tx
        .select({ limits: plans.limits })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .limit(1);
      const cap = plan?.limits.pilgrimsPerYear;
      if (cap) {
        const [{ n } = { n: 0 }] = await ctx.tx
          .select({ n: sql<number>`count(*)::int` })
          .from(pilgrims)
          .where(sql`${pilgrims.createdAt} >= date_trunc('year', now())`);
        if (n >= cap) throw new TRPCError({ code: "FORBIDDEN", message: `PLAN_LIMIT:${cap}` });
      }

      const discountMinor = discount ? parseAmount(discount) : 0;
      if (discountMinor < 0 || discountMinor > pkg.price) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_DISCOUNT" });
      }

      const passport = passportColumns(ctx.tenantId, passportNumber);
      if (passport.passportIndex && !allowDuplicatePassport) {
        const existing = await findByPassport(ctx.tx, passport.passportIndex);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: `DUPLICATE_PASSPORT:${existing.ref}` });
        }
      }

      const settings = await getSettings(ctx.tx);
      const ref = await nextReference(ctx.tx, settings, "pilgrim");
      const [row] = await ctx.tx
        .insert(pilgrims)
        .values({
          ...profile,
          ...passport,
          ...nidColumns(ctx.tenantId, nidNumber),
          ref,
          packageId,
          packagePrice: pkg.price,
          currency: pkg.currency,
          discount: discountMinor,
          inquiryId,
          status: passportNumber ? "documents" : "registered",
        })
        .returning({ id: pilgrims.id, ref: pilgrims.ref });

      if (inquiryId) {
        await ctx.tx
          .update(inquiries)
          .set({ status: "converted", convertedPilgrimId: row!.id })
          .where(and(eq(inquiries.id, inquiryId), isNull(inquiries.convertedPilgrimId)));
      }
      return row!;
    }),

  update: tenantProcedure
    .input(profileInput.partial().extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, nidNumber, ...patch } = input;
      const [row] = await ctx.tx
        .update(pilgrims)
        .set({ ...patch, ...nidColumns(ctx.tenantId, nidNumber) })
        .where(eq(pilgrims.id, id))
        .returning({ id: pilgrims.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  setPassport: tenantProcedure
    .input(
      z.object({
        id: z.uuid(),
        passportNumber: passportNumberInput,
        passportExpiry: z.iso.date().optional(),
        nationality: z.string().trim().length(3).toUpperCase().optional(),
        dateOfBirth: z.iso.date().optional(),
        gender: z.enum(["male", "female"]).optional(),
        allowDuplicatePassport: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, passportNumber, allowDuplicatePassport, ...rest } = input;
      const passport = passportColumns(ctx.tenantId, passportNumber);
      if (!allowDuplicatePassport) {
        const existing = await findByPassport(ctx.tx, passport.passportIndex!, id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: `DUPLICATE_PASSPORT:${existing.ref}` });
      }
      const [row] = await ctx.tx
        .update(pilgrims)
        .set({ ...passport, ...rest })
        .where(eq(pilgrims.id, id))
        .returning({ id: pilgrims.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Full passport number, for filling visa forms. Restricted, and each reveal is written to the audit trail. */
  revealPassport: withRoles("admin", "accountant")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .select({ enc: pilgrims.passportNumberEnc })
        .from(pilgrims)
        .where(eq(pilgrims.id, input.id));
      if (!row?.enc) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.tx.execute(sql`select record_access('pilgrims', ${input.id}, 'REVEAL_PASSPORT')`);
      return { passportNumber: decryptField(row.enc) };
    }),

  /**
   * Moving a pilgrim to "ready", "travelled" or "completed" requires every
   * readiness check to pass. An owner or admin may override with a reason,
   * which goes to the audit trail.
   */
  setStatus: tenantProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(pilgrimStatuses),
        overrideReason: z.string().trim().min(4).max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (FINAL_STATUSES.has(input.status)) {
        const check = await pilgrimReadiness(ctx.tx, input.id);
        if (!check.ready) {
          if (!input.overrideReason) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: `NOT_READY:${check.issues.length}` });
          }
          if (ctx.role !== "owner" && ctx.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
          await ctx.tx.execute(
            sql`select record_access('pilgrims', ${input.id}, ${`OVERRIDE_READY: ${input.overrideReason}`})`,
          );
        }
      }
      const [row] = await ctx.tx
        .update(pilgrims)
        .set({ status: input.status })
        .where(eq(pilgrims.id, input.id))
        .returning({ id: pilgrims.id, status: pilgrims.status });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  attachPassportScan: tenantProcedure
    .input(z.object({ id: z.uuid(), key: z.string().min(10).max(300) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.key.startsWith(`tenants/${ctx.tenantId}/pilgrims/${input.id}/`)) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      const [row] = await ctx.tx
        .update(pilgrims)
        .set({ passportScanKey: input.key })
        .where(eq(pilgrims.id, input.id))
        .returning({ id: pilgrims.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  passportScanKey: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ key: pilgrims.passportScanKey })
      .from(pilgrims)
      .where(eq(pilgrims.id, input.id));
    return row?.key ?? null;
  }),

  statusCounts: tenantProcedure.query(async ({ ctx }) => {
    const rows = await ctx.tx
      .select({ status: pilgrims.status, n: sql<number>`count(*)::int` })
      .from(pilgrims)
      .groupBy(pilgrims.status)
      .orderBy(asc(pilgrims.status));
    return rows;
  }),
});
