import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { calculateSalary, parseAmount, type SalaryResult } from "@hajj/core";
import type { Transaction } from "@hajj/db";
import {
  employeeAdvances,
  employees,
  ledgerEntries,
  salaryLines,
  salarySheets,
  type PayLine,
} from "@hajj/db/schema";
import { entryDate, getSettings } from "../services/tenant";
import { router, withRoles } from "../trpc";
import { amountInput, amountOrZero, dateKey, optionalText, paymentMethods } from "./shared";

const payroll = withRoles("admin", "accountant");

const payLines = z
  .array(z.object({ label: z.string().trim().min(1).max(60), amount: amountOrZero }))
  .max(12)
  .default([]);
const toLines = (lines: { label: string; amount: string }[]): PayLine[] =>
  lines.map((l) => ({ label: l.label, amount: parseAmount(l.amount) })).filter((l) => l.amount > 0);

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "INVALID_MONTH");

/** Advances given minus what paid sheets have already recovered, per employee. */
async function advanceBalances(tx: Transaction, exceptSheetId?: string) {
  const [given, recovered] = await Promise.all([
    tx
      .select({
        employeeId: employeeAdvances.employeeId,
        total: sql<number>`sum(${employeeAdvances.amount})::bigint`.mapWith(Number),
      })
      .from(employeeAdvances)
      .groupBy(employeeAdvances.employeeId),
    tx
      .select({
        employeeId: salaryLines.employeeId,
        total: sql<number>`sum(${salaryLines.advanceRecovery})::bigint`.mapWith(Number),
      })
      .from(salaryLines)
      .where(exceptSheetId ? ne(salaryLines.sheetId, exceptSheetId) : undefined)
      .groupBy(salaryLines.employeeId),
  ]);
  const out = new Map<string, number>();
  for (const g of given) out.set(g.employeeId, g.total);
  for (const r of recovered) out.set(r.employeeId, (out.get(r.employeeId) ?? 0) - r.total);
  return out;
}

function compute(line: {
  basic: number;
  allowances: PayLine[];
  deductions: PayLine[];
  advanceRecovery: number;
  unpaidAbsentDays: number;
  overtimeHours: number;
  overtimeRate: number;
  workingDays: number;
}): SalaryResult {
  try {
    return calculateSalary(line);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_SALARY" });
  }
}

async function sheetWithLines(tx: Transaction, where: ReturnType<typeof eq>) {
  const [sheet] = await tx.select().from(salarySheets).where(where);
  if (!sheet) return null;
  const lines = await tx
    .select({
      line: salaryLines,
      name: employees.name,
      designation: employees.designation,
      payoutMethod: employees.payoutMethod,
      accountNo: employees.accountNo,
    })
    .from(salaryLines)
    .innerJoin(employees, eq(employees.id, salaryLines.employeeId))
    .where(eq(salaryLines.sheetId, sheet.id))
    .orderBy(asc(employees.name));
  const rows = lines.map((l) => ({
    ...l.line,
    name: l.name,
    designation: l.designation,
    payoutMethod: l.payoutMethod,
    accountNo: l.accountNo,
    breakdown: compute({
      ...l.line,
      overtimeHours: Number(l.line.overtimeHours),
      workingDays: sheet.workingDays,
    }),
  }));
  const totals = rows.reduce(
    (a, r) => ({
      basic: a.basic + r.basic,
      allowances: a.allowances + r.breakdown.allowanceTotal,
      overtime: a.overtime + r.breakdown.overtime,
      gross: a.gross + r.gross,
      deductions: a.deductions + r.totalDeductions,
      advance: a.advance + r.advanceRecovery,
      net: a.net + r.net,
    }),
    { basic: 0, allowances: 0, overtime: 0, gross: 0, deductions: 0, advance: 0, net: 0 },
  );
  return { sheet, lines: rows, totals };
}

export const payrollRouter = router({
  employees: payroll
    .input(z.object({ includeInactive: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.tx
        .select()
        .from(employees)
        .where(input?.includeInactive === false ? eq(employees.active, true) : undefined)
        .orderBy(desc(employees.active), asc(employees.name));
      const advances = await advanceBalances(ctx.tx);
      return rows.map((e) => ({ ...e, advanceDue: Math.max(advances.get(e.id) ?? 0, 0) }));
    }),

  saveEmployee: payroll
    .input(
      z.object({
        id: z.uuid().optional(),
        name: z.string().trim().min(2).max(120),
        designation: optionalText(80),
        phone: optionalText(30),
        joinedOn: dateKey.optional(),
        basic: amountOrZero,
        allowances: payLines,
        payoutMethod: optionalText(40),
        accountNo: optionalText(60),
        notes: optionalText(300),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values = {
        name: input.name,
        designation: input.designation ?? null,
        phone: input.phone ?? null,
        joinedOn: input.joinedOn ?? null,
        basic: parseAmount(input.basic),
        allowances: toLines(input.allowances),
        payoutMethod: input.payoutMethod ?? null,
        accountNo: input.accountNo ?? null,
        notes: input.notes ?? null,
        active: input.active,
      };
      if (input.id) {
        const [row] = await ctx.tx
          .update(employees)
          .set(values)
          .where(eq(employees.id, input.id))
          .returning({ id: employees.id });
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }
      const [row] = await ctx.tx.insert(employees).values(values).returning({ id: employees.id });
      return row!;
    }),

  /** Money advanced to an employee now, recovered later from salary. Posted to the office ledger. */
  giveAdvance: payroll
    .input(
      z.object({
        employeeId: z.uuid(),
        amount: amountInput,
        method: z.enum(paymentMethods),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [employee] = await ctx.tx
        .select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(eq(employees.id, input.employeeId));
      if (!employee) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = await getSettings(ctx.tx);
      const day = entryDate(settings, ctx.role, input.date);
      const id = randomUUID();
      const amount = parseAmount(input.amount);
      const [entry] = await ctx.tx
        .insert(ledgerEntries)
        .values({
          unit: "office",
          direction: "out",
          amount,
          currency: "BDT",
          businessDate: day,
          sourceType: "salary_advance",
          sourceId: id,
          category: "advance",
          memo: employee.name,
        })
        .returning({ id: ledgerEntries.id });
      await ctx.tx
        .insert(employeeAdvances)
        .values({
          id,
          employeeId: employee.id,
          amount,
          givenOn: day,
          method: input.method,
          note: input.note,
          ledgerEntryId: entry!.id,
        });
      return { id };
    }),

  advances: payroll
    .input(z.object({ employeeId: z.uuid() }))
    .query(({ ctx, input }) =>
      ctx.tx
        .select()
        .from(employeeAdvances)
        .where(eq(employeeAdvances.employeeId, input.employeeId))
        .orderBy(desc(employeeAdvances.createdAt)),
    ),

  sheets: payroll.query(({ ctx }) =>
    ctx.tx
      .select({
        id: salarySheets.id,
        month: salarySheets.month,
        status: salarySheets.status,
        workingDays: salarySheets.workingDays,
        paidAt: salarySheets.paidAt,
        people: sql<number>`(select count(*)::int from ${salaryLines} l where l.sheet_id = "salary_sheets"."id")`,
        net: sql<number>`(select coalesce(sum(l.net), 0)::bigint from ${salaryLines} l where l.sheet_id = "salary_sheets"."id")`.mapWith(
          Number,
        ),
      })
      .from(salarySheets)
      .orderBy(desc(salarySheets.month)),
  ),

  sheet: payroll.input(z.object({ month })).query(async ({ ctx, input }) => {
    const data = await sheetWithLines(ctx.tx, eq(salarySheets.month, input.month));
    if (!data) return null;
    const advances = await advanceBalances(ctx.tx, data.sheet.id);
    return {
      ...data,
      advanceDue: Object.fromEntries([...advances].map(([k, v]) => [k, Math.max(v, 0)])) as Record<
        string,
        number
      >,
    };
  }),

  /**
   * Make the month's sheet, or bring a draft up to date: every active employee
   * gets a line with their current basic and allowances. Existing lines keep
   * what was entered on them.
   */
  generate: payroll
    .input(z.object({ month, workingDays: z.number().int().min(1).max(31).default(26) }))
    .mutation(async ({ ctx, input }) => {
      let [sheet] = await ctx.tx
        .select()
        .from(salarySheets)
        .where(eq(salarySheets.month, input.month))
        .for("update");
      if (!sheet) {
        [sheet] = await ctx.tx
          .insert(salarySheets)
          .values({ month: input.month, workingDays: input.workingDays })
          .returning();
      } else if (sheet.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_LOCKED" });
      } else if (sheet.workingDays !== input.workingDays) {
        [sheet] = await ctx.tx
          .update(salarySheets)
          .set({ workingDays: input.workingDays })
          .where(eq(salarySheets.id, sheet.id))
          .returning();
      }
      const existing = await ctx.tx
        .select()
        .from(salaryLines)
        .where(eq(salaryLines.sheetId, sheet!.id));
      const have = new Set(existing.map((l) => l.employeeId));
      const staff = await ctx.tx.select().from(employees).where(eq(employees.active, true));
      const fresh = staff.filter((e) => !have.has(e.id));
      if (fresh.length) {
        await ctx.tx.insert(salaryLines).values(
          fresh.map((e) => {
            const r = compute({
              basic: e.basic,
              allowances: e.allowances,
              deductions: [],
              advanceRecovery: 0,
              unpaidAbsentDays: 0,
              overtimeHours: 0,
              overtimeRate: 0,
              workingDays: sheet!.workingDays,
            });
            return {
              sheetId: sheet!.id,
              employeeId: e.id,
              basic: e.basic,
              allowances: e.allowances,
              gross: r.gross,
              totalDeductions: r.totalDeductions,
              net: r.net,
            };
          }),
        );
      }
      // Working days changed: absence deductions on existing lines must follow.
      for (const l of existing) {
        const r = compute({
          ...l,
          overtimeHours: Number(l.overtimeHours),
          workingDays: sheet!.workingDays,
        });
        if (r.net !== l.net || r.gross !== l.gross) {
          if (r.net < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "NEGATIVE_NET" });
          await ctx.tx
            .update(salaryLines)
            .set({ gross: r.gross, totalDeductions: r.totalDeductions, net: r.net })
            .where(eq(salaryLines.id, l.id));
        }
      }
      return { id: sheet!.id, added: fresh.length };
    }),

  updateLine: payroll
    .input(
      z.object({
        lineId: z.uuid(),
        allowances: payLines,
        deductions: payLines,
        unpaidAbsentDays: z.number().int().min(0).max(31),
        overtimeHours: z.number().min(0).max(400).multipleOf(0.25),
        overtimeRate: amountOrZero,
        advanceRecovery: amountOrZero,
        note: optionalText(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.tx
        .select({ line: salaryLines, sheet: salarySheets })
        .from(salaryLines)
        .innerJoin(salarySheets, eq(salarySheets.id, salaryLines.sheetId))
        .where(eq(salaryLines.id, input.lineId))
        .for("update");
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.sheet.status !== "draft")
        throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_LOCKED" });
      if (input.unpaidAbsentDays > row.sheet.workingDays)
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_SALARY" });

      const advanceRecovery = parseAmount(input.advanceRecovery);
      if (advanceRecovery > 0) {
        const due = Math.max(
          (await advanceBalances(ctx.tx, row.sheet.id)).get(row.line.employeeId) ?? 0,
          0,
        );
        if (advanceRecovery > due)
          throw new TRPCError({ code: "BAD_REQUEST", message: `ADVANCE_EXCEEDS:${due}` });
      }
      const values = {
        allowances: toLines(input.allowances),
        deductions: toLines(input.deductions),
        unpaidAbsentDays: input.unpaidAbsentDays,
        overtimeHours: input.overtimeHours,
        overtimeRate: parseAmount(input.overtimeRate),
        advanceRecovery,
      };
      const r = compute({ ...values, basic: row.line.basic, workingDays: row.sheet.workingDays });
      if (r.net < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "NEGATIVE_NET" });
      await ctx.tx
        .update(salaryLines)
        .set({
          ...values,
          overtimeHours: String(input.overtimeHours),
          gross: r.gross,
          totalDeductions: r.totalDeductions,
          net: r.net,
          note: input.note ?? null,
        })
        .where(eq(salaryLines.id, input.lineId));
      return r;
    }),

  removeLine: payroll.input(z.object({ lineId: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(salaryLines).where(eq(salaryLines.id, input.lineId));
    return { ok: true };
  }),

  /** Fix the figures. After this nothing on the sheet changes unless it is unlocked again. */
  lock: payroll.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [sheet] = await ctx.tx
      .select()
      .from(salarySheets)
      .where(eq(salarySheets.id, input.id))
      .for("update");
    if (!sheet) throw new TRPCError({ code: "NOT_FOUND" });
    if (sheet.status !== "draft")
      throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_LOCKED" });
    const [lines] = await ctx.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(salaryLines)
      .where(eq(salaryLines.sheetId, sheet.id));
    if (!lines?.n) throw new TRPCError({ code: "BAD_REQUEST", message: "EMPTY_SHEET" });
    await ctx.tx
      .update(salarySheets)
      .set({ status: "locked", lockedAt: new Date(), lockedBy: ctx.session.userId })
      .where(eq(salarySheets.id, sheet.id));
    return { ok: true };
  }),

  unlock: withRoles("admin")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [sheet] = await ctx.tx
        .select()
        .from(salarySheets)
        .where(eq(salarySheets.id, input.id))
        .for("update");
      if (!sheet) throw new TRPCError({ code: "NOT_FOUND" });
      if (sheet.status === "paid")
        throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_PAID" });
      await ctx.tx
        .update(salarySheets)
        .set({ status: "draft", lockedAt: null, lockedBy: null })
        .where(eq(salarySheets.id, sheet.id));
      return { ok: true };
    }),

  /** Pay a locked sheet: one office ledger entry per person, and the sheet becomes final. */
  pay: payroll
    .input(z.object({ id: z.uuid(), method: z.enum(paymentMethods), date: dateKey.optional() }))
    .mutation(async ({ ctx, input }) => {
      const [sheet] = await ctx.tx
        .select()
        .from(salarySheets)
        .where(eq(salarySheets.id, input.id))
        .for("update");
      if (!sheet) throw new TRPCError({ code: "NOT_FOUND" });
      if (sheet.status === "paid")
        throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_PAID" });
      if (sheet.status !== "locked")
        throw new TRPCError({ code: "BAD_REQUEST", message: "SHEET_NOT_LOCKED" });
      const settings = await getSettings(ctx.tx);
      const day = entryDate(settings, ctx.role, input.date);
      const lines = await ctx.tx
        .select({ id: salaryLines.id, net: salaryLines.net, name: employees.name })
        .from(salaryLines)
        .innerJoin(employees, eq(employees.id, salaryLines.employeeId))
        .where(and(eq(salaryLines.sheetId, sheet.id), sql`${salaryLines.net} > 0`));
      const now = new Date();
      if (lines.length) {
        await ctx.tx.insert(ledgerEntries).values(
          lines.map((l) => ({
            unit: "office" as const,
            direction: "out" as const,
            amount: l.net,
            currency: "BDT" as const,
            businessDate: day,
            occurredAt: now,
            sourceType: "salary",
            sourceId: l.id,
            category: input.method,
            memo: `${sheet.month} · ${l.name}`,
          })),
        );
      }
      await ctx.tx
        .update(salarySheets)
        .set({ status: "paid", paidAt: now })
        .where(eq(salarySheets.id, sheet.id));
      return { paid: lines.reduce((a, l) => a + l.net, 0), people: lines.length };
    }),
});
