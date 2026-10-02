import { assertMinor, mulDiv, sum } from "./money";

export interface SalaryLine {
  label: string;
  amount: number;
}

export interface SalaryInput {
  basic: number;
  allowances: readonly SalaryLine[];
  deductions: readonly SalaryLine[];
  /** Instalment recovered this month against an earlier advance. */
  advanceRecovery: number;
  /** Working days in the month and unpaid absences, for pro-rata deduction. */
  workingDays: number;
  unpaidAbsentDays: number;
  overtimeHours?: number;
  /** Overtime pay per hour, in minor units. */
  overtimeRate?: number;
}

export interface SalaryResult {
  basic: number;
  allowanceTotal: number;
  overtime: number;
  gross: number;
  absenceDeduction: number;
  deductionTotal: number;
  advanceRecovery: number;
  totalDeductions: number;
  net: number;
}

export function calculateSalary(input: SalaryInput): SalaryResult {
  const basic = assertMinor(input.basic, "basic");
  if (input.workingDays <= 0) throw new RangeError("workingDays must be positive");
  if (input.unpaidAbsentDays < 0 || input.unpaidAbsentDays > input.workingDays) {
    throw new RangeError("unpaidAbsentDays must be between 0 and workingDays");
  }

  const allowanceTotal = sum(input.allowances.map((a) => a.amount));
  const overtime = mulDiv(input.overtimeRate ?? 0, Math.round((input.overtimeHours ?? 0) * 100), 100);
  const gross = basic + allowanceTotal + overtime;

  // Absences are deducted from basic only, pro rata to working days.
  const absenceDeduction = mulDiv(basic, input.unpaidAbsentDays, input.workingDays);
  const deductionTotal = sum(input.deductions.map((d) => d.amount));
  const advanceRecovery = assertMinor(input.advanceRecovery, "advanceRecovery");
  const totalDeductions = absenceDeduction + deductionTotal + advanceRecovery;

  return {
    basic,
    allowanceTotal,
    overtime,
    gross,
    absenceDeduction,
    deductionTotal,
    advanceRecovery,
    totalDeductions,
    net: gross - totalDeductions,
  };
}
