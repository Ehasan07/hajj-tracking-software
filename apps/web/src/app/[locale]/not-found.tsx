import { getTranslations } from "next-intl/server";
import { LabbaikOrnament } from "@/components/sacred";
import { SwitchAccount } from "@/components/switch-account";
import { buttonClass, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/server/session";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const session = await getSession().catch(() => null);
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      <LabbaikOrnament className="pointer-events-none absolute -top-10 -right-10 text-[300px] text-haram-tint" />
      <div className="relative flex w-full max-w-lg animate-rise flex-col items-center gap-5 rounded-[160px_160px_24px_24px] bg-paper px-8 pt-20 pb-10 text-center shadow-[0_30px_60px_-40px_rgb(18_48_46/0.5)]">
        <Khatam className="h-16 w-16 animate-[turn_12s_linear_infinite] text-saffron" strokeWidth={6} />
        <p className="font-display text-6xl text-haram">৪০৪</p>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-[16px] leading-relaxed text-ink-2">{t("body")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClass("outline", "h-12")}>
            {t("home")}
          </Link>
          {session ? <SwitchAccount label={t("switch")} /> : null}
        </div>
        {session ? <p className="text-[13px] text-ink-3">{t("signedInAs", { email: session.user.email })}</p> : null}
      </div>
    </main>
  );
}
