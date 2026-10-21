"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { EmailCodeStep, type CodeChallenge } from "@/components/email-code-step";
import { PasswordField } from "@/components/password-field";
import { Button, Field } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Email and password; then, from a browser this account hasn't used before,
 * a 6-digit code sent to the account's email. The password stays in memory
 * until the code is accepted, then signs in once more from the now-trusted
 * browser.
 */
/** `canReset`: the server can send email, so the reset-by-code link is shown. */
export function SignInForm({ canReset }: { canReset: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  function done() {
    router.replace("/app");
    router.refresh();
  }

  /** Signs in; returns the message to show if it didn't work. */
  async function signIn(email: string, password: string): Promise<string | undefined> {
    const { data, error: failure } = await authClient.signIn.email({ email, password });
    if (failure) {
      if (failure.message === "LOCKED") return t("auth.locked");
      if (failure.status === 429) return t("auth.tooMany");
      return t("auth.invalid");
    }
    const step = data as unknown as { deviceVerification?: boolean; email?: string; device?: string; resendIn?: number };
    if (step?.deviceVerification) {
      setChallenge({ email: step.email ?? "", device: step.device ?? "", resendIn: step.resendIn ?? 45 });
      return undefined;
    }
    done();
    return undefined;
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setCredentials({ email, password });
    setPending(true);
    setError(undefined);
    setError(await signIn(email, password));
    setPending(false);
  }

  if (challenge && credentials) {
    return (
      <EmailCodeStep
        challenge={challenge}
        title={t("auth.device.title")}
        backLabel={t("auth.device.back")}
        onVerified={() => signIn(credentials.email, credentials.password)}
        onBack={(message) => {
          setChallenge(null);
          setError(message);
        }}
      />
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
