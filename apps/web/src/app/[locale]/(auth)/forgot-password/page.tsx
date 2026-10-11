import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { mailConfigured } from "@/server/mail";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Without email there is no way to send the code.
  await connection();
  if (!mailConfigured()) notFound();
  const t = await getTranslations("auth.forgot");
  return (
    <AuthShell title={t("title")}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
