"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { normalizeBdPhone } from "@hajj/core";
import { PasswordField, passwordReady } from "@/components/password-field";
import { PhoneVerify } from "@/components/phone-verify";
import { Button, Field } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

/** `phoneRequired`: SMS works on this server, so the owner proves a mobile number before setting up the agency. */
export function SignUpForm({ phoneRequired }: { phoneRequired: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [stage, setStage] = useState<"account" | "phone">("account");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const context = useMemo(() => ({ name, email }), [name, email]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mobile = normalizeBdPhone(phone);
    if (phoneRequired && !(mobile && /^\+8801[3-9]\d{8}$/.test(mobile))) {
      setPhoneError(t("phone.errors.INVALID_PHONE"));
      document.getElementById("phone")?.focus();
      return;
    }
    if (!passwordReady(password, context)) {
      setError(t("password.notReady"));
      document.getElementById("password")?.focus();
      return;
    }
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
    setPending(false);
    if (failure) {
      const code = failure.code ?? "";
      if (code === "WEAK_PASSWORD" || code.startsWith("PASSWORD_TOO")) setError(t("errors.WEAK_PASSWORD"));
      else if (code.startsWith("USER_ALREADY_EXISTS")) setError(t("errors.EMAIL_TAKEN"));
      else if (failure.status === 429) setError(t("auth.tooMany"));
      else setError(t("errors.generic"));
      return;
    }
    if (phoneRequired) setStage("phone");
    else router.replace("/onboarding");
  }

  if (stage === "phone") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{t("phone.title")}</h2>
          <p className="text-[15px] text-ink-2">{t("phone.why")}</p>
        </div>
        <PhoneVerify initialPhone={phone} autoSend onDone={() => router.replace("/onboarding")} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="name" name="name" autoComplete="name" required label={t("auth.name")} value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {phoneRequired ? (
        <Field
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="01XXX-XXXXXX"
          label={t("phone.label")}
          hint={t("phone.signUpHint")}
          value={phone}
          onChange={(e) => (setPhone(e.target.value), setPhoneError(undefined))}
          error={phoneError}
        />
      ) : null}
      <PasswordField
        id="password"
        name="password"
        autoComplete="new-password"
        required
        label={t("auth.password")}
        value={password}
        onValueChange={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        meter
        context={context}
        error={error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.signUp")}
      </Button>
      <p className="text-[15px] text-ink-2">
        {t("auth.haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-haram underline underline-offset-4">
          {t("common.signIn")}
        </Link>
      </p>
    </form>
  );
}
