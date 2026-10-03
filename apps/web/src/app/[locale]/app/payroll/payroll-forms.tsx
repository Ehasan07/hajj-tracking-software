"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { calculateSalary, parseAmount } from "@hajj/core";
import { FormError } from "@/components/form-error";
import { Button, Field, SelectField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { money, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

interface PayLine {
  label: string;
  amount: number;
}
interface PayLineText {
  label: string;
  amount: string;
}

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"] as const;
type Method = (typeof METHODS)[number];
const toText = (minor: number) =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
const minor = (text: string) => {
  if (!text.trim()) return 0;
  try {
    return parseAmount(text);
  } catch {
    return null;
  }
};

/** Rows of label + amount (allowances or deductions). */
function PayLines({
  id,
  label,
  lines,
  onChange,
  suggestions,
}: {
  id: string;
  label: string;
  lines: PayLineText[];
  onChange: (l: PayLineText[]) => void;
  suggestions: string[];
}) {
  const t = useTranslations("payroll");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            list={`${id}-suggest`}
            value={l.label}
            onChange={(e) =>
              onChange(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
            aria-label={t("lineLabel")}
            placeholder={t("lineLabel")}
            className="h-11 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong bg-field px-3 outline-none focus:border-haram"
          />
          <input
            inputMode="decimal"
            value={l.amount}
            onChange={(e) =>
              onChange(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
            }
            aria-label={t("lineAmount")}
            placeholder="0"
            className={`tabular h-11 w-32 rounded-md border-[1.5px] bg-field px-3 text-right outline-none focus:border-haram ${minor(l.amount) === null ? "border-due" : "border-line-strong"}`}
          />
          <button
            type="button"
            aria-label={t("removeLine")}
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            className="h-11 w-11 rounded-md text-ink-3 hover:bg-due-tint hover:text-due"
          >
            ✕
          </button>
        </div>
      ))}
      <datalist id={`${id}-suggest`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={() => onChange([...lines, { label: "", amount: "" }])}
        className="self-start text-[14px] font-semibold text-haram"
      >
        + {t("addLine")}
      </button>
    </fieldset>
  );
}

export interface EmployeeValues {
  id: string;
  name: string;
  designation: string | null;
  phone: string | null;
  joinedOn: string | null;
  basic: number;
  allowances: PayLine[];
  payoutMethod: string | null;
  accountNo: string | null;
  notes: string | null;
  active: boolean;
}

export function EmployeeForm({ initial }: { initial?: EmployeeValues }) {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [allowances, setAllowances] = useState<PayLineText[]>(
    initial
      ? initial.allowances.map((a) => ({ label: a.label, amount: toText(a.amount) }))
      : [{ label: t("suggest.house"), amount: "" }],
  );
  const [saved, setSaved] = useState(false);
  const save = useMutation(
    trpc.payroll.saveEmployee.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        if (!initial) {
          form.current?.reset();
          setAllowances([{ label: t("suggest.house"), amount: "" }]);
        }
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        save.mutate({
          id: initial?.id,
          name: s("name"),
          designation: s("designation") || undefined,
          phone: s("phone") || undefined,
          joinedOn: s("joinedOn") || undefined,
          basic: s("basic") || "0",
          allowances: allowances.filter((a) => a.label.trim() && a.amount.trim()),
          payoutMethod: s("payoutMethod") || undefined,
          accountNo: s("accountNo") || undefined,
          notes: s("notes") || undefined,
          active: initial ? f.get("active") === "on" : true,
        });
      }}
    >
      <Field
        id="em-name"
        name="name"
        required
        minLength={2}
        label={t("name")}
        defaultValue={initial?.name}
      />
      <Field
        id="em-designation"
        name="designation"
        label={t("designation")}
        defaultValue={initial?.designation ?? ""}
      />
      <Field
        id="em-phone"
        name="phone"
        inputMode="tel"
        label={t("phone")}
        defaultValue={initial?.phone ?? ""}
      />
      <Field
        id="em-joined"
        name="joinedOn"
        type="date"
        label={t("joinedOn")}
        defaultValue={initial?.joinedOn ?? ""}
      />
      <Field
        id="em-basic"
        name="basic"
        required
        inputMode="decimal"
        label={t("basic")}
        defaultValue={initial ? toText(initial.basic) : ""}
      />
      <Field
        id="em-payout"
        name="payoutMethod"
        list="em-payouts"
        label={t("payoutMethod")}
        defaultValue={initial?.payoutMethod ?? ""}
      />
      <datalist id="em-payouts">
        {["নগদ", "bKash", "Nagad", "ব্যাংক"].map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <Field
        id="em-account"
        name="accountNo"
        label={t("accountNo")}
        defaultValue={initial?.accountNo ?? ""}
      />
      <div className="sm:col-span-2">
        <PayLines
          id="em-allow"
          label={t("allowances")}
          lines={allowances}
          onChange={setAllowances}
          suggestions={[
            t("suggest.house"),
            t("suggest.transport"),
            t("suggest.medical"),
            t("suggest.mobile"),
            t("suggest.food"),
          ]}
        />
      </div>
      <Field id="em-notes" name="notes" label={t("notes")} defaultValue={initial?.notes ?? ""} />
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        {initial ? (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial.active}
              className="h-5 w-5 accent-haram"
            />
            <span className="font-semibold">{t("active")}</span>
          </label>
        ) : null}
        <FormError error={save.error} />
        {saved && !save.error ? (
          <p role="status" className="text-[14px] font-semibold text-paid">
            {tc("saved")}
          </p>
        ) : null}
        <Button type="submit" disabled={save.isPending} className="self-start">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

export function AdvanceForm({ employeeId, today }: { employeeId: string; today: string }) {
  const t = useTranslations("payroll");
  const tm = useTranslations("methods");
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const give = useMutation(
    trpc.payroll.giveAdvance.mutationOptions({
      onSuccess: () => {
        form.current?.reset();
        router.refresh();
      },
    }),
  );
  return (
    <form
      ref={form}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        give.mutate({
          employeeId,
          amount: s("amount"),
          method: s("method") as Method,
          note: s("note") || undefined,
          date: s("date") !== today ? s("date") : undefined,
        });
      }}
    >
      <Field id="ad-amount" name="amount" required inputMode="decimal" label={t("advanceAmount")} />
      <SelectField id="ad-method" name="method" label={t("paidBy")} defaultValue="cash">
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {tm(m)}
          </option>
        ))}
      </SelectField>
      <Field id="ad-note" name="note" label={t("notes")} />
      <Field
        id="ad-date"
        name="date"
        type="date"
        max={today}
        defaultValue={today}
        label={t("date")}
      />
      <FormError error={give.error} />
      <Button type="submit" disabled={give.isPending} className="self-start">
        {t("giveAdvance")}
      </Button>
    </form>
  );
}

export function GenerateSheetForm({
  month,
  workingDays,
  label,
}: {
  month: string;
  workingDays: number;
  label: string;
}) {
  const t = useTranslations("payroll");
  const trpc = useTRPC();
  const router = useRouter();
  const generate = useMutation(
    trpc.payroll.generate.mutationOptions({
      onSuccess: (_, input) => {
        router.push(`/app/payroll/${input.month}`);
        router.refresh();
      },
    }),
  );
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        generate.mutate({
          month: String(f.get("month")),
          workingDays: Number(f.get("workingDays") || 26),
        });
      }}
    >
      <Field
        id="gs-month"
        name="month"
        type="month"
        required
        defaultValue={month}
        label={t("month")}
      />
      <Field
        id="gs-days"
        name="workingDays"
        type="number"
        min={1}
        max={31}
        required
        defaultValue={workingDays}
        label={t("workingDays")}
        className="w-32"
      />
      <Button type="submit" disabled={generate.isPending}>
        {label}
      </Button>
      <div className="basis-full">
        <FormError error={generate.error} />
      </div>
    </form>
  );
}

export function SheetActions({
  id,
  status,
  isAdmin,
  today,
}: {
  id: string;
  status: "draft" | "locked" | "paid";
  isAdmin: boolean;
  today: string;
}) {
  const t = useTranslations("payroll");
  const tm = useTranslations("methods");
  const trpc = useTRPC();
  const router = useRouter();
  const done = { onSuccess: () => router.refresh() };
  const lock = useMutation(trpc.payroll.lock.mutationOptions(done));
  const unlock = useMutation(trpc.payroll.unlock.mutationOptions(done));
  const pay = useMutation(trpc.payroll.pay.mutationOptions(done));
  const [method, setMethod] = useState<Method>("bank");
  const [date, setDate] = useState(today);
  const busy = lock.isPending || unlock.isPending || pay.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {status === "draft" ? (
          <Button type="button" onClick={() => lock.mutate({ id })} disabled={busy}>
            {t("lock")}
          </Button>
        ) : null}
        {status === "locked" ? (
          <>
            <SelectField
              id="pay-method"
              label={t("paidBy")}
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {tm(m)}
                </option>
              ))}
            </SelectField>
            <Field
              id="pay-date"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value || today)}
              label={t("date")}
            />
            <Button
              type="button"
              variant="saffron"
              onClick={() => pay.mutate({ id, method, date: date !== today ? date : undefined })}
              disabled={busy}
            >
              {t("pay")}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => unlock.mutate({ id })}
                disabled={busy}
              >
                {t("unlock")}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      <FormError error={lock.error ?? unlock.error ?? pay.error} />
    </div>
  );
}

export interface LineValues {
  id: string;
  basic: number;
  allowances: PayLine[];
  deductions: PayLine[];
  unpaidAbsentDays: number;
  overtimeHours: string;
  overtimeRate: number;
  advanceRecovery: number;
  note: string | null;
}

/** Edit one person's line; the figures update as you type, with the same rules the server uses. */
export function LineEditor({
  line,
  workingDays,
  advanceDue,
}: {
  line: LineValues;
  workingDays: number;
  advanceDue: number;
}) {
  const t = useTranslations("payroll");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [allowances, setAllowances] = useState<PayLineText[]>(
    line.allowances.map((a) => ({ label: a.label, amount: toText(a.amount) })),
  );
  const [deductions, setDeductions] = useState<PayLineText[]>(
    line.deductions.map((a) => ({ label: a.label, amount: toText(a.amount) })),
  );
  const [absent, setAbsent] = useState(String(line.unpaidAbsentDays));
  const [otHours, setOtHours] = useState(String(Number(line.overtimeHours)));
  const [otRate, setOtRate] = useState(toText(line.overtimeRate));
  const [advance, setAdvance] = useState(toText(line.advanceRecovery));
  const [note, setNote] = useState(line.note ?? "");
  const update = useMutation(
    trpc.payroll.updateLine.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
    }),
  );
  const remove = useMutation(
    trpc.payroll.removeLine.mutationOptions({ onSuccess: () => router.refresh() }),
  );

  let preview: ReturnType<typeof calculateSalary> | null = null;
  try {
    const toLines = (l: PayLineText[]) =>
      l
        .filter((x) => x.label.trim())
        .map((x) => ({ label: x.label, amount: minor(x.amount) ?? NaN }));
    preview = calculateSalary({
      basic: line.basic,
      allowances: toLines(allowances),
      deductions: toLines(deductions),
      advanceRecovery: minor(advance) ?? NaN,
      workingDays,
      unpaidAbsentDays: Number(absent || 0),
      overtimeHours: Number(otHours || 0),
      overtimeRate: minor(otRate) ?? NaN,
    });
  } catch {
    preview = null;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-haram underline underline-offset-4"
      >
        {t("editLine")}
      </button>
    );
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("editLine")}
    >
      <div className="flex max-h-[92dvh] w-full max-w-3xl animate-rise flex-col gap-4 overflow-y-auto rounded-t-lg bg-paper p-5 text-left sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-bold">{t("editLine")}</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field
            id={`ab-${line.id}`}
            type="number"
            min={0}
            max={workingDays}
            value={absent}
            onChange={(e) => setAbsent(e.target.value)}
            label={t("absentDays")}
          />
          <Field
            id={`oh-${line.id}`}
            type="number"
            min={0}
            step={0.25}
            value={otHours}
            onChange={(e) => setOtHours(e.target.value)}
            label={t("overtimeHours")}
          />
          <Field
            id={`or-${line.id}`}
            inputMode="decimal"
            value={otRate}
            onChange={(e) => setOtRate(e.target.value)}
            label={t("overtimeRate")}
          />
          <Field
            id={`av-${line.id}`}
            inputMode="decimal"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            label={t("advanceRecovery")}
            hint={t("advanceDue", { amount: money(advanceDue, locale) })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PayLines
            id={`al-${line.id}`}
            label={t("allowances")}
            lines={allowances}
            onChange={setAllowances}
            suggestions={[
              t("suggest.house"),
              t("suggest.transport"),
              t("suggest.medical"),
              t("suggest.bonus"),
            ]}
          />
          <PayLines
            id={`de-${line.id}`}
            label={t("deductions")}
            lines={deductions}
            onChange={setDeductions}
            suggestions={[t("suggest.late"), t("suggest.loan"), t("suggest.tax")]}
          />
        </div>
        <Field
          id={`nt-${line.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          label={t("notes")}
        />
        {preview ? (
          <p className="tabular text-[15px]">
            {t("gross")} <b>{money(preview.gross, locale)}</b> − {t("totalDeductions")}{" "}
            <b>{money(preview.totalDeductions, locale)}</b> ={" "}
            <b className={preview.net < 0 ? "text-due" : "text-paid"}>
              {money(preview.net, locale)}
            </b>
          </p>
        ) : (
          <p className="text-[14px] font-semibold text-due">{t("checkFigures")}</p>
        )}
        <FormError error={update.error ?? remove.error} />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={!preview || preview.net < 0 || update.isPending}
            onClick={() =>
              update.mutate({
                lineId: line.id,
                allowances: allowances.filter((a) => a.label.trim() && a.amount.trim()),
                deductions: deductions.filter((a) => a.label.trim() && a.amount.trim()),
                unpaidAbsentDays: Number(absent || 0),
                overtimeHours: Number(otHours || 0),
                overtimeRate: otRate || "0",
                advanceRecovery: advance || "0",
                note: note || undefined,
              })
            }
          >
            {t("saveLine")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            ✕
          </Button>
          <Button
            type="button"
            variant="danger"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ lineId: line.id })}
          >
            {t("removeFromSheet")}
          </Button>
        </div>
      </div>
    </div>
  );
}
