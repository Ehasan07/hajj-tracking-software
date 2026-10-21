"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui";
import { useCountdown } from "@/components/use-countdown";
import { digits } from "@/lib/format";

export interface CodeChallenge {
  email: string;
  device: string;
  resendIn: number;
}

/**
 * The 6-digit code sent to the account's email, for a sign-in from a new
 * browser or a new account confirming its address. When the code is
 * accepted, `onVerified` signs in with the password the form still holds.
 */
export function EmailCodeStep({
  challenge,
  title,
  backLabel,
  onVerified,
  onBack,
}: {
  challenge: CodeChallenge;
  title: string;
  backLabel: string;
  onVerified: () => Promise<string | undefined>;
  onBack: (message?: string) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as "bn" | "en";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(challenge.resendIn);

  async function verify(value = code) {
    if (value.length !== 6) return;
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const res = await fetch("/api/device/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: value }),
    });
    if (res.ok) {
      const failed = await onVerified();
      setPending(false);
      if (failed) setError(failed);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; remaining?: number };
    setPending(false);
    setCode("");
    if (body.error === "incorrect") setError(t("auth.device.incorrect", { n: digits(body.remaining ?? 0, locale) }));
    else if (body.error === "expired") setError(t("auth.device.expired"));
    else if (body.error === "too_many") setError(t("auth.device.tooMany"));
    else if (res.status === 429) setError(t("auth.tooMany"));
    else onBack(t("auth.device.restart"));
  }

  async function resend() {
    setError(undefined);
    const res = await fetch("/api/device/resend", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { resendIn?: number; wait?: number; error?: string };
    if (res.ok) {
      setResendIn(body.resendIn ?? 45);
      setCode("");
      setNotice(t("auth.device.resent"));
    } else if (body.wait) setResendIn(body.wait);
    else onBack(t("auth.device.restart"));
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
      noValidate
    >
      <div className="flex flex-col gap-1.5 rounded-md bg-haram-tint px-4 py-3">
        <b className="text-[15px] text-haram-deep">{title}</b>
        <span className="text-[14px] text-ink-2">{t("auth.device.sent", { email: challenge.email })}</span>
        {challenge.device ? <span className="text-[13px] text-ink-3">{t("auth.device.this", { device: challenge.device })}</span> : null}
      </div>
      <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={pending} label={t("auth.device.code")} invalid={Boolean(error)} />
      {error ? (
        <p role="alert" className="text-[14px] font-semibold text-due">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-[14px] font-semibold text-paid">
          {notice}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending ? t("common.loading") : t("auth.device.verify")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
        <button type="button" onClick={() => void resend()} disabled={resendIn > 0} className="font-semibold text-haram underline underline-offset-4 disabled:text-ink-3 disabled:no-underline">
          {resendIn > 0 ? t("auth.device.resendIn", { s: digits(resendIn, locale) }) : t("auth.device.resend")}
        </button>
        <button type="button" onClick={() => onBack()} className="text-ink-2 hover:text-ink">
          {backLabel}
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-3">{t("auth.device.why")}</p>
    </form>
  );
}
