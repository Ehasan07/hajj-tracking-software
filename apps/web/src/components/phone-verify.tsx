"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { digits, type Locale } from "@/lib/format";
import { OtpInput } from "./otp-input";
import { Button, Field } from "./ui";
import { useCountdown } from "./use-countdown";

async function post(url: string, data: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; wait?: number; remaining?: number; masked?: string; resendIn?: number };
  return { ok: res.ok, ...json };
}

/**
 * Add a mobile number to the signed-in account: the number, then the 6-digit
 * code sent to it by SMS. `autoSend` texts `initialPhone` straight away (used
 * right after sign-up, where the number was just typed).
 */
export function PhoneVerify({ initialPhone = "", autoSend = false, onDone }: { initialPhone?: string; autoSend?: boolean; onDone: () => void }) {
  const t = useTranslations("phone");
  const locale = useLocale() as Locale;
  const [phone, setPhone] = useState(initialPhone);
  const [masked, setMasked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);
  const sentOnce = useRef(false);

  const explain = (r: { error?: string; wait?: number; remaining?: number }) => {
    if (r.error === "WAIT") return t("errors.WAIT", { s: digits(r.wait ?? 45, locale) });
    if (r.error === "INCORRECT") return t("errors.INCORRECT", { n: digits(r.remaining ?? 0, locale) });
    const known = ["INVALID_PHONE", "TAKEN", "TOO_MANY", "SEND_FAILED", "SMS_OFF", "EXPIRED", "INVALID"];
    return t(`errors.${known.includes(r.error ?? "") ? r.error : "generic"}` as "errors.generic");
  };

  async function send(number = phone) {
    setPending(true);
    setError(undefined);
    const r = await post("/api/phone/send", { phone: number });
    setPending(false);
    if (!r.ok) {
      if (r.error === "WAIT" && masked) return setResendIn(r.wait ?? 45);
      return setError(explain(r));
    }
    setMasked(r.masked ?? number);
    setResendIn(r.resendIn ?? 45);
    setCode("");
  }

  useEffect(() => {
    if (autoSend && initialPhone && !sentOnce.current) {
      sentOnce.current = true;
      void send(initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(value = code) {
    if (value.length !== 6) return;
    setPending(true);
    setError(undefined);
    const r = await post("/api/phone/verify", { code: value });
    setPending(false);
    if (!r.ok) {
      setCode("");
      return setError(explain(r));
    }
    onDone();
  }

  if (!masked) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void send();
        }}
      >
        <Field
          id="pv-phone"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="01XXX-XXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          label={t("label")}
          hint={t("hint")}
          error={error}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("send")}
        </Button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void verify();
      }}
    >
      <p className="text-[15px] leading-relaxed text-ink-2">{t("sent", { phone: masked })}</p>
      <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={pending} label={t("code")} invalid={Boolean(error)} />
      {error ? (
        <p role="alert" className="text-[14px] font-semibold text-due">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending ? t("checking") : t("verify")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
        <button type="button" disabled={resendIn > 0 || pending} onClick={() => void send()} className="font-semibold text-haram underline underline-offset-4 disabled:text-ink-3 disabled:no-underline">
          {resendIn > 0 ? t("resendIn", { s: digits(resendIn, locale) }) : t("resend")}
        </button>
        <button type="button" onClick={() => (setMasked(null), setError(undefined))} className="text-ink-2 hover:text-ink">
          {t("change")}
        </button>
      </div>
    </form>
  );
}
