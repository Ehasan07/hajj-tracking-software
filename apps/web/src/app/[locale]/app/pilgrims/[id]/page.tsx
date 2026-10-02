import { getTranslations, setRequestLocale } from "next-intl/server";
import { passportValidFor } from "@hajj/core/mrz";
import { PassportIcon, PhoneIcon, ReceiptIcon } from "@/components/icons";
import { PageBody } from "@/components/page-header";
import { Badge, Card, Khatam, RefChip } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, initials, money, phoneText, type Locale } from "@/lib/format";
import { PILGRIM_STATUS_TONE } from "@/lib/status";
import { api } from "@/trpc/server";
import { PassportScan, ReceivePayment, RevealPassport, SetPassport, StatusSelect, VoidPayment } from "./actions";

export default async function PilgrimPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [{ pilgrim: p, packageName, payments, totals }, me] = await Promise.all([
    caller.pilgrims.get({ id }),
    caller.tenant.me(),
  ]);
  const canManageMoney = ["owner", "admin", "accountant"].includes(me.role);
  const payable = p.packagePrice - p.discount;
  const pct = payable > 0 ? Math.min(totals.paid / payable, 1) : 0;
  const circumference = 2 * Math.PI * 52;
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoon = p.passportExpiry ? !passportValidFor(p.passportExpiry, today) : false;

  return (
    <PageBody>
      <div className="flex animate-rise flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-[32px_32px_14px_14px] bg-haram-tint text-xl font-bold text-haram-deep">
          {initials(p.fullName)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight">{p.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <RefChip>{p.ref}</RefChip>
            <Badge tone={PILGRIM_STATUS_TONE[p.status]}>{t(`pilgrimStatus.${p.status}`)}</Badge>
            {packageName ? <span className="text-[15px] text-ink-2">{packageName}</span> : null}
          </div>
        </div>
        <a href={`tel:${p.phone}`} className="inline-flex h-12 items-center gap-2 rounded-md bg-paper px-4 font-semibold text-haram">
          <PhoneIcon size={20} />
          {phoneText(p.phone, locale)}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="relative flex animate-rise flex-wrap items-center gap-6 overflow-hidden rounded-lg bg-haram-night p-6 text-ground [animation-delay:60ms]">
            <Khatam className="absolute -top-24 -right-24 h-72 w-72 animate-turn text-[#14635d]" strokeWidth={1} />
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#14635d" strokeWidth="11" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--color-saffron)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="text-2xl leading-none">{digits(Math.round(pct * 100), locale)}%</b>
                <span className="text-xs text-[#a9cfc9]">{t("pilgrim.paid")}</span>
              </span>
            </div>
            <dl className="relative grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-[13px] text-[#a9cfc9]">{t("pilgrim.price")}</dt>
                <dd className="tabular text-lg font-semibold">{money(p.packagePrice, locale, p.currency)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#a9cfc9]">{t("pilgrim.discount")}</dt>
                <dd className="tabular text-lg font-semibold">{money(p.discount, locale, p.currency)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#a9cfc9]">{t("pilgrim.paid")}</dt>
                <dd className="tabular text-2xl font-bold">{money(totals.paid, locale, p.currency)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#a9cfc9]">{totals.overpaid > 0 ? t("pilgrim.overpaid") : t("pilgrim.due")}</dt>
                <dd className={`tabular text-2xl font-bold ${totals.due > 0 ? "text-[#ffd9c2]" : "text-saffron"}`}>
                  {money(totals.overpaid > 0 ? totals.overpaid : totals.due, locale, p.currency)}
                </dd>
              </div>
            </dl>
            {totals.due === 0 && totals.paid > 0 ? (
              <p className="relative w-full -rotate-1 font-hand text-2xl text-saffron">{t("pilgrim.allPaid")}</p>
            ) : null}
          </section>

          {p.status !== "cancelled" ? (
            <Card className="animate-rise p-6 [animation-delay:120ms]">
              <h2 className="mb-5 text-lg font-bold">{t("payment.title")}</h2>
              <ReceivePayment pilgrimId={p.id} due={totals.due} />
            </Card>
          ) : null}

          <Card className="animate-rise overflow-hidden [animation-delay:180ms]">
            <h2 className="px-6 pt-5 pb-3 text-lg font-bold">{t("pilgrim.payments")}</h2>
            {payments.length === 0 ? (
              <p className="px-6 pb-6 text-ink-3">{t("pilgrim.noPayments")}</p>
            ) : (
              <ul>
                {payments.map((pay) => (
                  <li key={pay.id} className="flex flex-wrap items-center gap-3 border-t border-[#eef3f2] px-6 py-4">
                    <ReceiptIcon size={26} tint={pay.voidedAt ? "var(--color-ground)" : "var(--color-haram-tint)"} accent="var(--color-haram)" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/app/receipts/${pay.id}`} className="font-mono text-sm text-haram hover:underline">
                        {pay.receiptNo}
                      </Link>
                      <span className="text-[13px] text-ink-3">
                        {dateText(pay.receivedAt, locale, true)} · {t(`methods.${pay.method}`)}
                        {pay.reference ? ` · ${pay.reference}` : ""}
                      </span>
                      {pay.voidedAt ? (
                        <span className="text-[13px] font-semibold text-due">
                          {t("payment.voided")}: {pay.voidReason}
                        </span>
                      ) : null}
                    </div>
                    <span className={`tabular text-lg font-bold ${pay.voidedAt ? "text-ink-3 line-through" : ""}`}>
                      {money(pay.amount, locale, pay.currency)}
                    </span>
                    {canManageMoney && !pay.voidedAt ? <VoidPayment id={pay.id} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="flex animate-rise flex-col gap-4 p-6 [animation-delay:90ms]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-11 items-center justify-center rounded-[22px_22px_8px_8px] bg-haram-tint">
                <PassportIcon size={26} tint="var(--color-paper)" accent="var(--color-haram)" />
              </span>
              <h2 className="text-lg font-bold">{t("pilgrim.passport")}</h2>
            </div>
            {p.passportMasked ? (
              <dl className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1">
                  <dt className="text-[13px] text-ink-3">{t("pilgrims.passportNumber")}</dt>
                  <dd className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xl tracking-widest">{p.passportMasked}</span>
                    {canManageMoney ? <RevealPassport id={p.id} /> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-3">{t("pilgrims.passportExpiry")}</dt>
                  <dd className={`font-semibold ${expiringSoon ? "text-due" : ""}`}>
                    {p.passportExpiry ? dateText(p.passportExpiry, locale) : "—"}
                  </dd>
                  {expiringSoon ? <dd className="text-[13px] text-due">{t("pilgrim.expiresSoon")}</dd> : null}
                </div>
                <div>
                  <dt className="text-[13px] text-ink-3">{t("pilgrims.nationality")}</dt>
                  <dd className="font-semibold">{p.nationality ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <>
                <p className="text-ink-3">{t("pilgrim.passportMissing")}</p>
                <SetPassport id={p.id} />
              </>
            )}
            <div className="border-t border-dashed border-line pt-4">
              <PassportScan id={p.id} hasScan={p.hasPassportScan} />
            </div>
          </Card>

          <Card className="flex animate-rise flex-col gap-4 p-6 [animation-delay:150ms]">
            <h2 className="text-lg font-bold">{t("pilgrim.profile")}</h2>
            <dl className="grid grid-cols-2 gap-4 text-[15px]">
              {[
                [t("pilgrims.fatherName"), p.fatherName],
                [t("pilgrims.gender"), p.gender ? t(`pilgrims.${p.gender}`) : null],
                [t("pilgrims.dob"), p.dateOfBirth ? dateText(p.dateOfBirth, locale) : null],
                [t("pilgrims.altPhone"), p.altPhone ? phoneText(p.altPhone, locale) : null],
                [t("pilgrims.email"), p.email],
                [t("pilgrims.district"), p.district],
                [t("pilgrims.emergency"), p.emergencyName ? `${p.emergencyName}${p.emergencyPhone ? ` · ${phoneText(p.emergencyPhone, locale)}` : ""}` : null],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-ink-3">{label}</dt>
                  <dd className="font-semibold break-words">{value || "—"}</dd>
                </div>
              ))}
              <div className="col-span-2 flex flex-col gap-0.5">
                <dt className="text-[13px] text-ink-3">{t("pilgrims.address")}</dt>
                <dd className="font-semibold whitespace-pre-line">{p.address || "—"}</dd>
              </div>
              {p.notes ? (
                <div className="col-span-2 rounded-md bg-ground px-4 py-3 whitespace-pre-line">{p.notes}</div>
              ) : null}
            </dl>
            <StatusSelect id={p.id} status={p.status} />
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
