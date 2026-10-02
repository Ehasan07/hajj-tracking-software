"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (failure) {
      setError(failure.status === 429 ? t("auth.tooMany") : t("auth.invalid"));
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field id="email" name="email" type="email" autoComplete="email" required label={t("auth.email")} />
      <Field
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={t("auth.password")}
        error={error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.signIn")}
      </Button>
      <p className="text-[15px] text-ink-2">
        {t("auth.noAccount")}{" "}
        <Link href="/sign-up" className="font-semibold text-zamzam underline underline-offset-4">
          {t("common.signUp")}
        </Link>
      </p>
    </form>
  );
}
