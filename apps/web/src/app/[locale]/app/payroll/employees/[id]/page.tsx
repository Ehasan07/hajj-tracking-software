import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { periodKey } from "@hajj/core";
import { NoAccess } from "@/components/no-access";
import { PageBody, PageHeader } from "@/components/page-header";
import { buttonClass, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, money, type Locale } from "@/lib/format";
import { BOOK_ROLES } from "@/lib/units";
import { api } from "@/trpc/server";
import { AdvanceForm, EmployeeForm } from "../../payroll-forms";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const caller = await api();
  const [me, settings] = await Promise.all([caller.tenant.me(), caller.tenant.settings()]);
  if (!BOOK_ROLES.includes(me.role)) return <NoAccess />;
  const employees = await caller.payroll.employees();
  const employee = employees.find((e) => e.id === id);
  if (!employee) notFound();
  const advances = await caller.payroll.advances({ employeeId: id });
  const today = periodKey(new Date(), "day", settings?.timeZone);

  return (
    <PageBody>
      <Link href="/app/payroll" className={buttonClass("outline", "self-start")}>
        ← {t("payroll.title")}
      </Link>
      <PageHeader title={employee.name} subtitle={employee.designation ?? undefined} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-bold">{t("payroll.details")}</h2>
          <EmployeeForm initial={employee} />
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-1 p-6">
            <span className="text-[13px] font-semibold text-ink-3">{t("payroll.advanceOpen")}</span>
            <span
              className={`tabular text-3xl font-bold ${employee.advanceDue > 0 ? "text-due" : ""}`}
            >
              {money(employee.advanceDue, locale)}
            </span>
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">{t("payroll.giveAdvance")}</h2>
            <AdvanceForm employeeId={employee.id} today={today} />
          </Card>
          {advances.length ? (
            <Card className="flex flex-col gap-2 p-6">
              <h2 className="text-lg font-bold">{t("payroll.advances")}</h2>
              <ul className="flex flex-col gap-1.5 text-[14px]">
                {advances.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span>
                      {dateText(a.givenOn, locale)} · {t(`methods.${a.method}`)}
                      {a.note ? <span className="text-ink-3"> · {a.note}</span> : null}
                    </span>
                    <b className="tabular">{money(a.amount, locale)}</b>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </PageBody>
  );
}
