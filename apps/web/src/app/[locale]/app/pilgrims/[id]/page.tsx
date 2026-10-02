import { getTranslations, setRequestLocale } from "next-intl/server";
import { documentsFor, documentType, type ReadinessIssue } from "@hajj/core";
import { passportValidFor } from "@hajj/core/mrz";
import { PassportIcon, PhoneIcon, ReceiptIcon } from "@/components/icons";
import { PageBody } from "@/components/page-header";
import { Badge, Card, Khatam, RefChip } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, initials, money, phoneText, type Locale } from "@/lib/format";
import { PILGRIM_STATUS_TONE } from "@/lib/status";
import { api } from "@/trpc/server";
import { ReceivePayment, RevealPassport, SetPassport, StatusSelect, VoidPayment } from "./actions";
import { DocumentsPanel } from "./documents-panel";
import { ProfileForm } from "./profile-form";

export default async function PilgrimPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [{ pilgrim: p, packageName, packageKind, payments, totals, documents, readiness }, me] = await Promise.all([
    caller.pilgrims.get({ id }),
    caller.tenant.me(),
  ]);
  const canManageMoney = ["owner", "admin", "accountant"].includes(me.role);
  const payable = p.packagePrice - p.discount;
  const pct = payable > 0 ? Math.min(totals.paid / payable, 1) : 0;
  const circumference = 2 * Math.PI * 52;
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoon = p.passportExpiry ? !passportValidFor(p.passportExpiry, today) : false;
  const docTypes = documentsFor({ kind: packageKind ?? "hajj", gender: p.gender, dateOfBirth: p.dateOfBirth }, today);
  // Required papers, plus passport number, passport validity, full payment, and the PRP number for Hajj.
  const requiredCount = docTypes.filter((d) => d.required).length + 3 + (packageKind === "umrah" ? 0 : 1);
  const doneCount = Math.max(requiredCount - readiness.issues.length, 0);
  const issueText = (i: ReadinessIssue) => {
    if ("code" in i) return t(`ready.${i.kind}`, { name: documentType(i.code)?.name[locale] ?? i.code });
    if (i.kind === "payment_due") return t("ready.payment_due", { due: money(i.due, locale, p.currency) });
    return t(`ready.${i.kind}`);
  };

  return (
    <PageBody>
      <div className="flex animate-rise flex-wrap items-center gap-4">
        {p.hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/pilgrim/${p.id}/photo`}
            alt={p.fullName}
            className="h-20 w-16 rounded-[32px_32px_14px_14px] border-2 border-paper object-cover shadow-[0_8px_20px_-10px_rgb(18_48_46/0.5)]"
          />
        ) : (
          <span className="flex h-20 w-16 items-center justify-center rounded-[32px_32px_14px_14px] bg-haram-tint text-xl font-bold text-haram-deep">
            {initials(p.fullName)}
          </span>
        )}
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
          <Card className={`flex animate-rise flex-col gap-4 p-6 ${readiness.ready ? "ring-2 ring-paid" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{t("ready.title")}</h2>
              <span className="text-sm font-semibold text-ink-3">
                {t("ready.done", { done: digits(doneCount, locale), total: digits(requiredCount, locale) })}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e6eeec]">
              <div
                className={`h-full origin-left animate-grow rounded-full ${readiness.ready ? "bg-paid" : "bg-saffron"}`}
                style={{ width: `${(doneCount / requiredCount) * 100}%` }}
              />
            </div>
            {readiness.ready ? (
              <p className="flex items-center gap-2 font-semibold text-paid">{t("ready.ready")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-3">{t("ready.notReady")}</span>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {readiness.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px]">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-due" />
                      {issueText(issue)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>


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

          <Card className="animate-rise p-6 [animation-delay:40ms]">
            <div className="mb-2 flex flex-col gap-0.5">
              <h2 className="text-lg font-bold">{t("docs.title")}</h2>
              <p className="text-[13px] text-ink-3">{t("docs.hint")}</p>
            </div>
            <DocumentsPanel
              pilgrimId={p.id}
              types={docTypes.map((d) => ({ code: d.code, name: d.name, hint: d.hint, required: d.required, imageOnly: d.imageOnly, hasExpiry: d.hasExpiry }))}
              documents={documents}
              canReview={me.role !== "shop_operator"}
            />
          </Card>

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
          </Card>

          <Card className="flex animate-rise flex-col gap-4 p-6 [animation-delay:150ms]">
            <h2 className="text-lg font-bold">{t("pilgrim.profile")}</h2>
            <dl className="grid grid-cols-2 gap-4 text-[15px]">
              {[
                [t("pilgrims.fatherName"), p.fatherName],
                [t("profile.motherName"), p.motherName],
                [t("profile.spouseName"), p.spouseName],
                [t("profile.nid"), p.nidMasked],
                [t("profile.prp"), p.prpNumber],
                [t("profile.hajjReg"), p.hajjRegNumber],
                [t("profile.visa"), p.visaNumber],
                [t("profile.bloodGroup"), p.bloodGroup],
                [t("profile.occupation"), p.occupation],
                ...(p.gender === "female" ? [[t("profile.mahram"), p.mahramName ? `${p.mahramName}${p.mahramRelation ? ` (${p.mahramRelation})` : ""}` : null]] : []),
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
                <dt className="text-[13px] text-ink-3">{t("profile.presentAddress")}</dt>
                <dd className="font-semibold whitespace-pre-line">{p.address || "—"}</dd>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <dt className="text-[13px] text-ink-3">{t("profile.permanentAddress")}</dt>
                <dd className="font-semibold whitespace-pre-line">{p.permanentAddress || "—"}</dd>
              </div>
              {p.notes ? (
                <div className="col-span-2 rounded-md bg-ground px-4 py-3 whitespace-pre-line">{p.notes}</div>
              ) : null}
            </dl>
            <ProfileForm
              id={p.id}
              nidMasked={p.nidMasked}
              values={{
                fullName: p.fullName,
                fatherName: p.fatherName,
                motherName: p.motherName,
                spouseName: p.spouseName,
                phone: p.phone,
                altPhone: p.altPhone,
                email: p.email,
                gender: p.gender,
                dateOfBirth: p.dateOfBirth,
                bloodGroup: p.bloodGroup,
                occupation: p.occupation,
                address: p.address,
                permanentAddress: p.permanentAddress,
                district: p.district,
                prpNumber: p.prpNumber,
                hajjRegNumber: p.hajjRegNumber,
                visaNumber: p.visaNumber,
                mahramName: p.mahramName,
                mahramRelation: p.mahramRelation,
                emergencyName: p.emergencyName,
                emergencyPhone: p.emergencyPhone,
                notes: p.notes,
              }}
            />
            <StatusSelect id={p.id} status={p.status} canOverride={me.role === "owner" || me.role === "admin"} />
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
