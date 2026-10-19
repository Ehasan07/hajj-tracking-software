"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { PasswordField, passwordReady } from "@/components/password-field";
import { Button, Field } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const context = useMemo(() => ({ name, email }), [name, email]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    router.replace("/onboarding");
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
