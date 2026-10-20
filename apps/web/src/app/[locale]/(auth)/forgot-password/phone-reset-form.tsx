"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { OtpInput } from "@/components/otp-input";
import { PasswordField, passwordReady } from "@/components/password-field";
import { Button, Field } from "@/components/ui";
import { useCountdown } from "@/components/use-countdown";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { digits, type Locale } from "@/lib/format";

type Step = "phone" | "code" | "password";

async function post(url: string, data: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; remaining?: number; email?: string; resendIn?: number };
  return { ok: res.ok, status: res.status, ...json };
}

/**
 * Mobile → code → new password, then signed straight in. Like the email
 * form, the next step looks the same whether or not the number has an account.
 */
export function PhoneResetForm() {
  const t = useTranslations("phone.reset");
  const tp = useTranslations("password");
  const te = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);

  const codeError = (r: { error?: string; remaining?: number; status: number }) => {
    if (r.status === 429) return t("errors.TOO_MANY");
    if (r.error === "INCORRECT") return t("errors.INCORRECT", { n: digits(r.remaining ?? 0, locale) });
    if (r.error === "EXPIRED") return t("errors.EXPIRED");
    if (r.error === "TOO_MANY") return t("errors.TOO_MANY_TRIES");
    return t("errors.INVALID");
  };

  async function send() {
    setPending(true);
    setError(undefined);
    const r = await post("/api/phone/reset/send", { phone });
    setPending(false);
    if (!r.ok) return setError(r.error === "INVALID_PHONE" ? t("errors.INVALID_PHONE") : r.status === 429 ? t("errors.TOO_MANY") : t("errors.generic"));
    setResendIn(r.resendIn ?? 45);
    setCode("");
    setStep("code");
  }

  async function check(value = code) {
    if (value.length !== 6) return;
    setPending(true);
    setError(undefined);
    const r = await post("/api/phone/reset/check", { phone, code: value });
    setPending(false);
    if (!r.ok) {
      setCode("");
      return setError(codeError(r));
    }
    setStep("password");
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordReady(password)) return setError(tp("notReady"));
    if (password !== confirm) return setError(tp("mismatch"));
    setPending(true);
    setError(undefined);
    const r = await post("/api/phone/reset/confirm", { phone, code, password });
    if (!r.ok) {
      setPending(false);
      if (r.error === "WEAK_PASSWORD") return setError(te("WEAK_PASSWORD"));
      setStep("code");
      setCode("");
      return setError(codeError(r));
    }
    // This browser is now trusted, so signing in with the account's email goes straight through.
    const signedIn = await authClient.signIn.email({ email: r.email!, password });
    setPending(false);
    if (signedIn.error) return router.replace("/sign-in");
    router.replace("/app");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <p className="text-[15px] leading-relaxed text-ink-2">{t("intro")}</p>
        <Field id="rp-phone" name="phone" inputMode="tel" autoComplete="tel" required placeholder="01XXX-XXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} label={t("label")} error={error} />
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("send")}
        </Button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void check();
        }}
      >
        <div className="rounded-md bg-haram-tint px-4 py-3 text-[14px] text-ink-2">{t("sent", { phone })}</div>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => void check(v)} disabled={pending} label={t("code")} invalid={Boolean(error)} />
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
          <button type="button" onClick={() => (setStep("phone"), setError(undefined))} className="text-ink-2 hover:text-ink">
            {t("otherNumber")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="flex flex-col gap-5" noValidate>
      <PasswordField id="rp-password" name="password" autoComplete="new-password" required label={t("newPassword")} value={password} onValueChange={(v) => (setPassword(v), setError(undefined))} meter />
      <PasswordField id="rp-confirm" name="confirm" autoComplete="new-password" required label={t("confirm")} value={confirm} onValueChange={(v) => (setConfirm(v), setError(undefined))} matchWith={password} error={error} />
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
      <p className="text-[13px] text-ink-3">{t("afterNote")}</p>
    </form>
  );
}
