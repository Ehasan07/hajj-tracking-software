import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatMoney } from "@hajj/core";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/session";
import { api } from "@/trpc/server";

export default async function AppHome({ params }: { params: Promise<{ locale: "bn" | "en" }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (!session.session.activeOrganizationId) return redirect({ href: "/onboarding", locale });

  const caller = await api();
  const settings = await caller.tenant.settings();
  if (!settings) return redirect({ href: "/onboarding", locale });

  const t = await getTranslations("dashboard");
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <p className="text-ink-3">{settings.legalName}</p>
      <h1 className="text-4xl font-bold tracking-tight">{t("greeting", { name: session.user.name })}</h1>
      <section className="rounded-lg bg-ink p-7 text-marble">
        <p className="text-[15px] text-[#b9b4a6]">{t("todayCollection")}</p>
        <p className="tabular mt-3 text-5xl font-bold">{formatMoney(0, "BDT", locale, { compactFraction: true })}</p>
      </section>
    </main>
  );
}
