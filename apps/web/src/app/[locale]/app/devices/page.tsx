import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { DeviceIcon, ShieldIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { dateText, digits, type Locale } from "@/lib/format";
import { deviceCheckEnabled, TRUST_COOKIE, TRUST_DAYS, unsign } from "@/server/device-otp";
import { api } from "@/trpc/server";
import { getSession } from "@/server/session";
import { maskPhone, smsConfigured, verifiedPhone } from "@/server/phone-otp";
import { RevokeDevice, SignOutOthers } from "./device-actions";
import { PhoneCard } from "./phone-card";

export default async function DevicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("devices");
  // The browser's own token never leaves the server; it only marks which row is "this device".
  const current = unsign((await cookies()).get(TRUST_COOKIE)?.value) ?? undefined;
  const { devices, openSessions } = await (await api()).account.devices({ current });
  const enabled = deviceCheckEnabled();
  const session = await getSession();
  const phone = session ? await verifiedPhone(session.user.id) : null;

  return (
    <PageBody>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card className="flex flex-wrap items-start gap-4 p-6">
        <span className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[26px_26px_10px_10px] bg-haram-tint">
          <ShieldIcon size={30} tint="var(--color-paper)" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <b className="text-[17px]">{enabled ? t("on") : t("off")}</b>
          <p className="text-[14px] leading-relaxed text-ink-2">{enabled ? t("howItWorks", { days: digits(TRUST_DAYS, locale) }) : t("offHint")}</p>
          <ul className="mt-1 flex flex-col gap-1 text-[13px] text-ink-3">
            <li>• {t("rules.code")}</li>
            <li>• {t("rules.lock")}</li>
            <li>• {t("rules.alert")}</li>
            <li>• {t("rules.reset")}</li>
          </ul>
        </div>
      </Card>

      {smsConfigured() ? <PhoneCard masked={phone ? maskPhone(phone) : null} /> : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold">{t("trusted", { n: digits(devices.length, locale) })}</h2>
          <SignOutOthers sessions={openSessions} />
        </div>
        {devices.length === 0 ? (
          <p className="px-6 pb-6 text-ink-3">{t("none")}</p>
        ) : (
          <ul>
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 border-t border-[#eef3f2] px-6 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ground">
                  <DeviceIcon kind={d.deviceType} size={24} tint="var(--color-paper)" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="flex flex-wrap items-center gap-2">
                    {d.label}
                    {d.current ? <span className="rounded-full bg-paid-tint px-2.5 py-0.5 text-[12px] font-semibold text-paid">{t("thisDevice")}</span> : null}
                  </b>
                  <span className="text-[13px] text-ink-3">
                    {t("added", { date: dateText(d.createdAt, locale) })} · {t("lastSeen", { date: dateText(d.lastSeenAt, locale, true) })}
                    {d.ip ? ` · ${d.ip}` : ""}
                  </span>
                  <span className="text-[12px] text-ink-3">{t("until", { date: dateText(d.expiresAt, locale) })}</span>
                </span>
                <RevokeDevice id={d.id} current={d.current} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageBody>
  );
}
