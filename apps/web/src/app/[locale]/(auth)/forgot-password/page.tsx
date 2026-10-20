import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { mailConfigured } from "@/server/mail";
import { smsConfigured } from "@/server/sms";
import { ResetChooser } from "./reset-chooser";

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // A code goes by email or SMS; with neither set up there is no way to send one.
  await connection();
  const email = mailConfigured();
  const sms = smsConfigured();
  if (!email && !sms) notFound();
  const t = await getTranslations("auth.forgot");
  return (
    <AuthShell title={t("title")}>
      <ResetChooser email={email} sms={sms} />
    </AuthShell>
  );
}
