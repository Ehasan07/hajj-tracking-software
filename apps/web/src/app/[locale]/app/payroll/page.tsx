import { getTranslations, setRequestLocale } from "next-intl/server";
import { periodKey } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { digits, initials, money, type Locale } from "@/lib/format";
import { keyLabel } from "@/lib/period";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { EmployeeForm, GenerateSheetForm } from "./payroll-forms";

const SHEET_TONE = { draft: "pending", locked: "info", paid: "paid" } as const;

export default async function PayrollPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("payroll");
  const caller = await api();
  const [me, settings] = await Promise.all([caller.tenant.me(), caller.tenant.settings()]);
  if (!BOOK_ROLES.includes(me.role)) return <NoAccess />;
  const [employees, sheets] = await Promise.all([
    caller.payroll.employees(),
    caller.payroll.sheets(),
  ]);
  const month = periodKey(new Date(), "month", settings?.timeZone);
  const active = employees.filter((e) => e.active);
  const monthly = active.reduce(
    (a, e) => a + e.basic + e.allowances.reduce((x, l) => x + l.amount, 0),
    0,
  );

  return (
    <PageBody>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-bold">{t("sheetsTitle")}</h2>
          <GenerateSheetForm month={month} workingDays={26} label={t("generate")} />
          {sheets.length === 0 ? (
            <p className="text-ink-3">{t("noSheets")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {sheets.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/payroll/${s.month}`}
                    className="flex flex-wrap items-center gap-3 py-3 hover:text-haram"
                  >
                    <b className="min-w-36">{keyLabel(s.month, locale)}</b>
                    <Badge tone={SHEET_TONE[s.status]}>{t(`status.${s.status}`)}</Badge>
                    <span className="text-[13px] text-ink-3">
                      {t("people", { n: digits(s.people, locale) })}
                    </span>
                    <span className="tabular ml-auto font-bold">{money(s.net, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex flex-col justify-center gap-1 rounded-[60px_60px_18px_18px] bg-haram-night p-7 text-white">
          <span className="text-[14px] text-[#a9cfc9]">{t("monthlyBill")}</span>
          <span className="tabular text-4xl font-bold">{money(monthly, locale)}</span>
          <span className="text-[13px] text-[#a9cfc9]">
            {t("activeStaff", { n: digits(active.length, locale) })}
          </span>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("employees")}</h2>
        <Reveal label={t("addEmployee")}>
          <EmployeeForm />
        </Reveal>
        {employees.length === 0 ? (
          <Card>
            <EmptyState title={t("noEmployees")} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[15px]">
                <thead className="bg-field text-left text-[13px] text-ink-3">
                  <tr>
                    <th className="px-5 py-3 font-normal">{t("name")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("basic")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("allowances")}</th>
                    <th className="px-3 py-3 text-right font-normal">{t("monthlyTotal")}</th>
                    <th className="px-5 py-3 text-right font-normal">{t("advanceOpen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const allowance = e.allowances.reduce((a, l) => a + l.amount, 0);
                    return (
                      <tr
                        key={e.id}
                        className={`border-t border-[#eef3f2] hover:bg-field ${e.active ? "" : "text-ink-3"}`}
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/app/payroll/employees/${e.id}`}
                            className="flex items-center gap-3"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-unit-office-tint text-sm font-bold text-unit-office">
                              {initials(e.name)}
                            </span>
                            <span className="flex flex-col">
                              <b className="font-semibold hover:text-haram">{e.name}</b>
                              <span className="text-[12px] text-ink-3">{e.designation ?? "—"}</span>
                            </span>
                            {!e.active ? <Badge>{t("inactive")}</Badge> : null}
                          </Link>
                        </td>
                        <td className="tabular px-3 py-3 text-right">{money(e.basic, locale)}</td>
                        <td className="tabular px-3 py-3 text-right">{money(allowance, locale)}</td>
                        <td className="tabular px-3 py-3 text-right font-bold">
                          {money(e.basic + allowance, locale)}
                        </td>
                        <td
                          className={`tabular px-5 py-3 text-right ${e.advanceDue > 0 ? "font-semibold text-due" : "text-ink-3"}`}
                        >
                          {money(e.advanceDue, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageBody>
  );
}
