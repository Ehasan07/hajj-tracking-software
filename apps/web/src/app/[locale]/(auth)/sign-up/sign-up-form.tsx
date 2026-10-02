"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (failure) {
      setError(failure.message ?? t("auth.invalid"));
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="name" name="name" autoComplete="name" required label={t("auth.name")} />
      <Field id="email" name="email" type="email" autoComplete="email" required label={t("auth.email")} />
      <Field
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        label={t("auth.password")}
        hint={t("auth.passwordHint")}
        error={error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.signUp")}
      </Button>
      <p className="text-[15px] text-ink-2">
        {t("auth.haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-zamzam underline underline-offset-4">
          {t("common.signIn")}
        </Link>
      </p>
    </form>
  );
}
