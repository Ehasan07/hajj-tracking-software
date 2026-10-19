"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { OtpInput } from "@/components/otp-input";
import { PasswordField } from "@/components/password-field";
import { Button, Field } from "@/components/ui";
import { useCountdown } from "@/components/use-countdown";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { digits } from "@/lib/format";

interface Challenge {
  email: string;
  device: string;
}

/**
 * Email and password; then, from a browser this account hasn't used before,
 * a 6-digit code sent to the account's email. The password stays in memory
 * until the code is accepted, then signs in once more from the now-trusted
 * browser.
 */
/** `canReset`: the server can send email, so the reset-by-code link is shown. */
export function SignInForm({ canReset }: { canReset: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as "bn" | "en";
  const router = useRouter();
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);

  function done() {
    router.replace("/app");
    router.refresh();
  }

  async function signIn(email: string, password: string) {
    const { data, error: failure } = await authClient.signIn.email({ email, password });
    if (failure) {
      if (failure.status === 429) setError(failure.message === "LOCKED" ? t("auth.locked") : t("auth.tooMany"));
      else setError(t("auth.invalid"));
      return;
    }
    const step = data as unknown as { deviceVerification?: boolean; email?: string; device?: string; resendIn?: number };
    if (step?.deviceVerification) {
      setChallenge({ email: step.email ?? "", device: step.device ?? "" });
      setResendIn(step.resendIn ?? 45);
      setCode("");
      return;
    }
    done();
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setCredentials({ email, password });
    setPending(true);
    setError(undefined);
    await signIn(email, password);
    setPending(false);
  }

  async function verify(value = code) {
    if (value.length !== 6 || !credentials) return;
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const res = await fetch("/api/device/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: value }),
    });
    if (res.ok) {
      await signIn(credentials.email, credentials.password);
      setPending(false);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; remaining?: number };
    setPending(false);
    setCode("");
    if (body.error === "incorrect") setError(t("auth.device.incorrect", { n: digits(body.remaining ?? 0, locale) }));
    else if (body.error === "expired") setError(t("auth.device.expired"));
    else if (body.error === "too_many") setError(t("auth.device.tooMany"));
    else if (res.status === 429) setError(t("auth.tooMany"));
    else {
      setChallenge(null);
      setError(t("auth.device.restart"));
    }
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
    else {
      setChallenge(null);
      setError(t("auth.device.restart"));
    }
  }

  if (challenge) {
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
          <b className="text-[15px] text-haram-deep">{t("auth.device.title")}</b>
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
          <button
            type="button"
            onClick={() => {
              setChallenge(null);
              setError(undefined);
              setNotice(undefined);
            }}
            className="text-ink-2 hover:text-ink"
          >
            {t("auth.device.back")}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-3">{t("auth.device.why")}</p>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="flex flex-col gap-5" noValidate>
      <Field id="email" name="email" type="email" autoComplete="email" required label={t("auth.email")} defaultValue={credentials?.email} />
      <PasswordField id="password" name="password" autoComplete="current-password" required label={t("auth.password")} error={error} />
      {canReset ? (
        <div className="-mt-2 flex justify-end">
          <Link href="/forgot-password" className="text-[14px] font-semibold text-haram underline underline-offset-4">
            {t("auth.forgot.link")}
          </Link>
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.signIn")}
      </Button>
      <p className="text-[15px] text-ink-2">
        {t("auth.noAccount")}{" "}
        <Link href="/sign-up" className="font-semibold text-haram underline underline-offset-4">
          {t("common.signUp")}
        </Link>
      </p>
    </form>
  );
}
