"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { OtpInput } from "@/components/otp-input";
import { Button, Field } from "@/components/ui";
import { useCountdown } from "@/components/use-countdown";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { digits } from "@/lib/format";

type Step = "email" | "code" | "password";

/**
 * Email → code → new password, then signed straight in. Whether or not the
 * email belongs to an account, the next step looks the same and a wrong code
 * reads the same, so the form can't be used to find out who has an account.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "bn" | "en";
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);

  async function request(target: string) {
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.emailOtp.requestPasswordReset({ email: target });
    setPending(false);
    if (failure && failure.status === 429) {
      setError(t("tooMany"));
      return false;
    }
    setResendIn(45);
    return true;
  }

  async function onEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError(t("forgot.badEmail"));
      return;
    }
    setEmail(target);
    if (await request(target)) {
      setCode("");
      setStep("code");
    }
  }

  function codeError(failure: { code?: string; status?: number }) {
    if (failure.code === "OTP_EXPIRED") return t("device.expired");
    if (failure.code === "TOO_MANY_ATTEMPTS") return t("device.tooMany");
    if (failure.status === 429) return t("tooMany");
    return t("forgot.incorrect");
  }

  async function check(value = code) {
    if (value.length !== 6) return;
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const { error: failure } = await authClient.emailOtp.checkVerificationOtp({ email, otp: value, type: "forget-password" });
    setPending(false);
    if (failure) {
      setCode("");
      setError(codeError(failure));
      return;
    }
    setStep("password");
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 10) return setError(t("forgot.short"));
    if (password !== String(form.get("confirm"))) return setError(t("forgot.mismatch"));
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.emailOtp.resetPassword({ email, otp: code, password });
    if (failure) {
      setPending(false);
      setStep("code");
      setCode("");
      setError(codeError(failure));
      return;
    }
    // The browser that reset the password is now trusted, so this signs straight in.
    const signedIn = await authClient.signIn.email({ email, password });
    setPending(false);
    if (signedIn.error || (signedIn.data as unknown as { deviceVerification?: boolean })?.deviceVerification) {
      router.replace("/sign-in");
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={onEmail} className="flex flex-col gap-5" noValidate>
        <p className="text-[15px] leading-relaxed text-ink-2">{t("forgot.intro")}</p>
        <Field id="email" name="email" type="email" autoComplete="email" required label={t("email")} defaultValue={email} error={error} />
        <Button type="submit" disabled={pending}>
          {pending ? t("forgot.sending") : t("forgot.send")}
        </Button>
        <Link href="/sign-in" className="text-[15px] font-semibold text-haram underline underline-offset-4">
          ← {t("forgot.backToSignIn")}
        </Link>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void check();
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="rounded-md bg-haram-tint px-4 py-3 text-[14px] text-ink-2">{t("forgot.sent", { email })}</div>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => void check(v)} disabled={pending} label={t("device.code")} invalid={Boolean(error)} />
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
          {pending ? t("forgot.checking") : t("device.verify")}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
          <button
            type="button"
            disabled={resendIn > 0 || pending}
            onClick={async () => {
              if (await request(email)) {
                setCode("");
                setNotice(t("device.resent"));
              }
            }}
            className="font-semibold text-haram underline underline-offset-4 disabled:text-ink-3 disabled:no-underline"
          >
            {resendIn > 0 ? t("device.resendIn", { s: digits(resendIn, locale) }) : t("device.resend")}
          </button>
          <button type="button" onClick={() => setStep("email")} className="text-ink-2 hover:text-ink">
            {t("forgot.otherEmail")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="flex flex-col gap-5" noValidate>
      {/* Lets the browser's password manager save the new password against the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <Field id="password" name="password" type="password" autoComplete="new-password" required minLength={10} label={t("forgot.newPassword")} hint={t("forgot.rule")} />
      <Field id="confirm" name="confirm" type="password" autoComplete="new-password" required label={t("forgot.confirm")} error={error} />
      <Button type="submit" disabled={pending}>
        {pending ? t("forgot.saving") : t("forgot.save")}
      </Button>
      <p className="text-[13px] text-ink-3">{t("forgot.afterNote")}</p>
    </form>
  );
}
