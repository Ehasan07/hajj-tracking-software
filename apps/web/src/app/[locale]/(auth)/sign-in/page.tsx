import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { mailConfigured } from "@/server/mail";
import { smsConfigured } from "@/server/sms";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  // Read at request time: whether email works depends on the server, not the build.
  await connection();
  return (
    <AuthShell title={t("signInTitle")}>
      <SignInForm canReset={mailConfigured() || smsConfigured()} />
    </AuthShell>
  );
}
