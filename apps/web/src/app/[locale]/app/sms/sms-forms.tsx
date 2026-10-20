"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { SMS_MAX_LENGTH, smsSize } from "@hajj/core";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { CheckIcon } from "@/components/icons";
import { Button, SelectField, TextAreaField } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { digits, type Locale } from "@/lib/format";
import { useTRPC } from "@/trpc/react";

const STATUSES = ["registered", "documents", "visa", "ready", "travelled", "completed"] as const;
const TEMPLATES = ["flight", "meeting", "papers"] as const;

export function ReceiptToggle({ on }: { on: boolean }) {
  const t = useTranslations("sms.receipts");
  const trpc = useTRPC();
  const router = useRouter();
  const [value, setValue] = useState(on);
  const save = useMutation(trpc.sms.setReceipts.mutationOptions({ onSuccess: () => router.refresh() }));
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <b className="text-[15px]">{t("title")}</b>
        <span className="text-[13px] leading-relaxed text-ink-3">{t("hint")}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t("title")}
        disabled={save.isPending}
        onClick={() => {
          setValue(!value);
          save.mutate({ on: !value });
        }}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${value ? "bg-paid" : "bg-line-strong"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${value ? "left-7" : "left-1"}`} />
      </button>
    </div>
  );
}

export function NoticeForm({ packages, remaining }: { packages: { id: string; name: string }[]; remaining: number | null }) {
  const t = useTranslations("sms.notice");
  const ts = useTranslations("pilgrimStatus");
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const [group, setGroup] = useState<"all" | "package" | "status">("all");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ready");
  const [text, setText] = useState("");
  const [done, setDone] = useState<{ recipients: number; queued: number } | null>(null);
  const audience = { group, packageId: group === "package" ? packageId || undefined : undefined, status: group === "status" ? status : undefined };
  const count = useQuery(trpc.sms.audience.queryOptions(audience, { enabled: group !== "package" || Boolean(packageId) }));
  const send = useMutation(
    trpc.sms.sendNotice.mutationOptions({
      onSuccess: (r) => {
        setDone({ recipients: r.recipients, queued: r.queued });
        setText("");
        router.refresh();
      },
    }),
  );
  const size = smsSize(text);
  const recipients = count.data?.recipients ?? 0;
  const total = size.parts * recipients;
  const over = remaining != null && total > remaining;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(null);
        if (!window.confirm(t("confirm", { n: digits(recipients, locale), parts: digits(total, locale) }))) return;
        send.mutate({ ...audience, text });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="sms-group" label={t("to")} value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
          <option value="all">{t("groups.all")}</option>
          <option value="package" disabled={packages.length === 0}>
            {t("groups.package")}
          </option>
          <option value="status">{t("groups.status")}</option>
        </SelectField>
        {group === "package" ? (
          <SelectField id="sms-package" label={t("package")} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        ) : null}
        {group === "status" ? (
          <SelectField id="sms-status" label={t("status")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
      <p className="text-[14px] text-ink-2" aria-live="polite">
        {count.isLoading ? "…" : t("recipients", { n: digits(recipients, locale) })}
      </p>

      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((k) => (
          <button key={k} type="button" onClick={() => setText(t(`templates.${k}`))} className="rounded-full border border-line bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink-2 hover:border-haram hover:text-haram">
            {t(`templateNames.${k}`)}
          </button>
        ))}
      </div>
      <TextAreaField id="sms-text" label={t("text")} value={text} onChange={(e) => setText(e.target.value)} maxLength={SMS_MAX_LENGTH} required minLength={5} className="min-h-32" />
      <p className={`text-[13px] ${over ? "font-semibold text-due" : "text-ink-3"}`}>
        {t("size", { chars: digits(size.length, locale), parts: digits(size.parts, locale), total: digits(total, locale) })}
        {over ? ` ${t("over", { n: digits(remaining ?? 0, locale) })}` : ""}
      </p>
      <FormError error={send.error} />
      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-md bg-paid-tint px-4 py-3 text-[15px] font-semibold text-paid">
          <CheckIcon size={18} />
          {t("done", { n: digits(done.queued, locale) })}
        </p>
      ) : null}
      <Button type="submit" disabled={send.isPending || recipients === 0 || text.trim().length < 5 || over} className="self-start">
        {send.isPending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
