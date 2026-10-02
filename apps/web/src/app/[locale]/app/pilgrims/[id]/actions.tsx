"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { parsePassportMrz } from "@hajj/core/mrz";
import { FormError, useErrorText } from "@/components/form-error";
import { CheckIcon, ReceiptIcon, UploadIcon } from "@/components/icons";
import { Button, buttonClass, Field, SelectField, Spinner, TextAreaField } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { errorKey } from "@/lib/errors";
import { money, type Locale } from "@/lib/format";
import { PILGRIM_STATUSES } from "@/lib/status";
import { useTRPC } from "@/trpc/react";

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "card", "other"] as const;

export function ReceivePayment({ pilgrimId, due }: { pilgrimId: string; due: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [amount, setAmount] = useState("");
  const [last, setLast] = useState<{ id: string; receiptNo: string } | null>(null);
  const [allowOver, setAllowOver] = useState(false);
  const receive = useMutation(
    trpc.payments.receive.mutationOptions({
      onSuccess: (row) => {
        setLast({ id: row.id, receiptNo: row.receiptNo });
        setAmount("");
        setAllowOver(false);
        form.current?.reset();
        setMethod("cash");
        router.refresh();
      },
    }),
  );
  const over = receive.error && errorKey(receive.error).key === "OVERPAYMENT";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setLast(null);
    receive.mutate({
      pilgrimId,
      amount,
      method,
      reference: String(f.get("reference") ?? ""),
      purpose: String(f.get("purpose") ?? ""),
      allowOverpayment: allowOver,
    });
  }

  return (
    <form ref={form} onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Field
          id="amount"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          label={t("payment.amount")}
          className="tabular h-14 text-2xl font-bold"
          placeholder="০"
        />
        {due > 0 ? (
          <button
            type="button"
            onClick={() => setAmount((due / 100).toFixed(2).replace(/\.00$/, ""))}
            className="self-start text-sm font-semibold text-haram underline underline-offset-4"
          >
            {t("payment.fullDue")}: {money(due, locale)}
          </button>
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">{t("payment.method")}</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <label
              key={m}
              className="flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-line-strong bg-paper px-4 text-[15px] font-semibold transition-colors has-[:checked]:border-haram has-[:checked]:bg-haram has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="sr-only"
              />
              {t(`methods.${m}`)}
            </label>
          ))}
        </div>
      </fieldset>
      {method !== "cash" ? (
        <Field id="reference" name="reference" required label={t("payment.reference")} hint={t("payment.referenceHint")} className="font-mono" />
      ) : null}
      <Field id="purpose" name="purpose" label={t("payment.purpose")} placeholder={t("payment.purposePlaceholder")} />
      {over ? (
        <label className="flex items-center gap-3 rounded-md bg-saffron-tint px-4 py-3 text-[15px] font-semibold text-saffron-ink">
          <input type="checkbox" checked={allowOver} onChange={(e) => setAllowOver(e.target.checked)} className="h-5 w-5 accent-[var(--color-saffron-deep)]" />
          {t("payment.allowOverpay")}
        </label>
      ) : null}
      <FormError error={receive.error} />
      <Button type="submit" disabled={receive.isPending} className="h-14 text-lg">
        {receive.isPending ? <Spinner label={t("common.loading")} className="h-6 w-6" /> : <ReceiptIcon size={22} tint="transparent" accent="var(--color-saffron)" />}
        {t("payment.submit")}
      </Button>
      {last ? (
        <div className="flex animate-rise flex-wrap items-center justify-between gap-3 rounded-md bg-paid-tint px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-paid">
            <CheckIcon size={18} />
            {t("payment.success", { receipt: last.receiptNo })}
          </span>
          <Link href={`/app/receipts/${last.id}`} className={buttonClass("outline", "h-10 border-paid text-paid")}>
            {t("payment.viewReceipt")}
          </Link>
        </div>
      ) : null}
    </form>
  );
}

export function VoidPayment({ id }: { id: string }) {
  const t = useTranslations("payment");
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const voidIt = useMutation(trpc.payments.void.mutationOptions({ onSuccess: () => router.refresh() }));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-due hover:underline">
        {t("void")}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-due-tint p-3">
      <TextAreaField id={`void-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} label={t("voidReason")} className="min-h-16 bg-paper" />
      <FormError error={voidIt.error} />
      <Button type="button" variant="danger" disabled={reason.trim().length < 4 || voidIt.isPending} onClick={() => voidIt.mutate({ id, reason })}>
        {t("confirmVoid")}
      </Button>
    </div>
  );
}

export function StatusSelect({ id, status }: { id: string; status: (typeof PILGRIM_STATUSES)[number] }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const set = useMutation(trpc.pilgrims.setStatus.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <SelectField
      id="status"
      label={t("pilgrim.changeStatus")}
      value={status}
      disabled={set.isPending}
      onChange={(e) => set.mutate({ id, status: e.target.value as typeof status })}
    >
      {PILGRIM_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`pilgrimStatus.${s}`)}
        </option>
      ))}
    </SelectField>
  );
}

export function RevealPassport({ id }: { id: string }) {
  const t = useTranslations("pilgrim");
  const trpc = useTRPC();
  const reveal = useMutation(trpc.pilgrims.revealPassport.mutationOptions());
  const errorText = useErrorText();
  if (reveal.data) {
    return <span className="font-mono text-xl font-medium tracking-widest select-all">{reveal.data.passportNumber}</span>;
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <button type="button" disabled={reveal.isPending} onClick={() => reveal.mutate({ id })} className="text-sm font-semibold text-haram underline underline-offset-4">
        {t("reveal")}
      </button>
      {reveal.error ? <span className="text-[13px] text-due">{errorText(reveal.error)}</span> : null}
    </span>
  );
}

export function PassportScan({ id, hasScan }: { id: string; hasScan: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState<string>();
  const errorText = useErrorText();

  async function upload(file: File) {
    setState("uploading");
    setError(undefined);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/files/passport/${id}`, { method: "POST", body });
    if (!res.ok) {
      const { error: code } = (await res.json().catch(() => ({ error: "generic" }))) as { error: string };
      setError(errorText(new Error(code)));
      setState("idle");
      return;
    }
    setState("done");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <label className={buttonClass("outline", "h-11 cursor-pointer")}>
          {state === "uploading" ? <Spinner label={t("common.loading")} className="h-5 w-5" /> : <UploadIcon size={20} accent="var(--color-haram)" />}
          {hasScan ? t("pilgrim.replaceScan") : t("pilgrim.uploadScan")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="sr-only"
            disabled={state === "uploading"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {hasScan ? (
          <a href={`/api/files/passport/${id}`} target="_blank" rel="noopener" className={buttonClass("quiet", "h-11 px-2")}>
            {t("pilgrim.viewScan")}
          </a>
        ) : null}
      </div>
      <p className="text-[13px] text-ink-3">{state === "done" ? t("pilgrim.scanUploaded") : t("pilgrim.scanHint")}</p>
      {error ? <p role="alert" className="text-[13px] font-semibold text-due">{error}</p> : null}
    </div>
  );
}

export function SetPassport({ id }: { id: string }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [extra, setExtra] = useState<{ dateOfBirth?: string; gender?: "male" | "female"; nationality?: string }>({});
  const [allowDup, setAllowDup] = useState(false);
  const set = useMutation(trpc.pilgrims.setPassport.mutationOptions({ onSuccess: () => router.refresh() }));
  const dup = set.error && errorKey(set.error).key === "DUPLICATE_PASSPORT";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        set.mutate({ id, passportNumber: number, passportExpiry: expiry || undefined, ...extra, allowDuplicatePassport: allowDup });
      }}
    >
      <TextAreaField
        id="mrz-set"
        spellCheck={false}
        label={t("pilgrims.mrz")}
        className="min-h-20 font-mono text-[13px] tracking-wider uppercase"
        onChange={(e) => {
          const r = parsePassportMrz(e.target.value);
          if (!r.ok) return;
          setNumber(r.value.passportNumber);
          setExpiry(r.value.expiryDate);
          setExtra({
            dateOfBirth: r.value.dateOfBirth,
            gender: r.value.sex === "M" ? "male" : r.value.sex === "F" ? "female" : undefined,
            nationality: r.value.nationality,
          });
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pp-number" required value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} className="font-mono" label={t("pilgrims.passportNumber")} />
        <Field id="pp-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} label={t("pilgrims.passportExpiry")} />
      </div>
      {dup ? (
        <label className="flex items-center gap-3 rounded-md bg-saffron-tint px-4 py-3 text-[14px] font-semibold text-saffron-ink">
          <input type="checkbox" checked={allowDup} onChange={(e) => setAllowDup(e.target.checked)} className="h-5 w-5" />
          {t("pilgrims.confirmDuplicate")}
        </label>
      ) : null}
      <FormError error={set.error} />
      <Button type="submit" disabled={set.isPending} className="self-start">
        {t("pilgrim.setPassport")}
      </Button>
    </form>
  );
}
