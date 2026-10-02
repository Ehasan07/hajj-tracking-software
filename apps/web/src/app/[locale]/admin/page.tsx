import { getTranslations, setRequestLocale } from "next-intl/server";
import { CountUp } from "@/components/count-up";
import { PageBody } from "@/components/page-header";
import { Badge, Card, Khatam } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { dateText, digits, money, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";

/** Subscription states use the status palette and always carry a text label. */
const STATUS_COLOR: Record<string, string> = {
  active: "var(--color-paid)",
  trial: "var(--color-saffron)",
  past_due: "var(--color-due)",
  suspended: "#7a1f1f",
  cancelled: "var(--color-ink-3)",
  none: "var(--color-line-strong)",
};
const STATUS_ORDER = ["active", "trial", "past_due", "suspended", "cancelled", "none"] as const;

export default async function AdminOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const caller = await api();
  const [o, agencies] = await Promise.all([caller.platform.overview(), caller.platform.agencies()]);

  const now = Date.now();
  const attention = agencies
    .filter((a) => {
      const trialEnd = a.trial_ends_at ? new Date(a.trial_ends_at).getTime() : null;
      return (
        a.status === "past_due" ||
        a.status === "suspended" ||
        (a.status === "trial" && trialEnd !== null && trialEnd < now + 7 * 864e5)
      );
    })
    .slice(0, 8);
  const recent = agencies.slice(0, 6);
  const statusTotal = STATUS_ORDER.reduce((sum, s) => sum + (o.byStatus[s] ?? 0), 0) || 1;

  // Last six calendar months, filling empty months with zero.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    return { key, n: o.signupsByMonth.find((m) => m.month === key)?.n ?? 0, date: d };
  });
  const maxSignups = Math.max(1, ...months.map((m) => m.n));
  const monthName = (d: Date) => new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "short" }).format(d);

  const tiles = [
    { label: t("overview.agencies"), value: digits(o.agencies, locale), sub: `${t("overview.new30")}: ${digits(o.newAgencies30d, locale)}` },
    { label: t("overview.pilgrims"), value: digits(o.pilgrims, locale), sub: t("overview.pilgrimsYear", { n: digits(o.pilgrimsThisYear, locale) }) },
    { label: t("overview.collections"), value: money(o.collectionsThisMonth, locale), sub: null },
  ];

  return (
    <PageBody>
      <h1 className="animate-rise text-3xl font-bold tracking-tight sm:text-4xl">{t("overview.title")}</h1>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="relative flex animate-rise flex-col gap-3 overflow-hidden rounded-[120px_120px_22px_22px] bg-ink px-8 pt-14 pb-7 text-ground lg:col-span-5">
          <Khatam className="absolute top-[-120px] left-1/2 h-[300px] w-[300px] -translate-x-1/2 animate-turn text-[#1c3533]" strokeWidth={0.8} />
          <p className="relative text-center text-[15px] text-[#a9cfc9]">{t("overview.mrr")}</p>
          <p className="relative text-center text-5xl leading-none font-bold tracking-tight">
            <CountUp value={o.mrr} locale={locale} />
          </p>
          <p className="relative text-center text-[13px] text-[#9fb8b4]">{t("overview.mrrHint")}</p>
          <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
            {(["active", "trial", "suspended"] as const).map((s) => (
              <div key={s} className="flex flex-col gap-0.5">
                <span className="text-2xl font-bold">{digits(o.byStatus[s] ?? 0, locale)}</span>
                <span className="text-[12px] text-[#a9cfc9]">{t(`overview.${s}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          {tiles.map((tile, i) => (
            <Card key={tile.label} className="flex animate-rise flex-col gap-2 p-5" style={{ animationDelay: `${60 + i * 50}ms` }}>
              <span className="text-[13px] font-semibold text-ink-3">{tile.label}</span>
              <span className="tabular text-2xl font-bold break-words xl:text-[26px]">{tile.value}</span>
              {tile.sub ? <span className="text-[13px] text-ink-3">{tile.sub}</span> : null}
            </Card>
          ))}

          <Card className="flex animate-rise flex-col gap-3 p-5 sm:col-span-3 [animation-delay:200ms]">
            <span className="text-[13px] font-semibold text-ink-3">{t("overview.statusMix")}</span>
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={t("overview.statusMix")}>
              {STATUS_ORDER.map((s) => {
                const n = o.byStatus[s] ?? 0;
                if (!n) return null;
                return <span key={s} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: n, background: STATUS_COLOR[s] }} title={`${t(`status.${s}`)}: ${n}`} />;
              })}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
              {STATUS_ORDER.filter((s) => (o.byStatus[s] ?? 0) > 0).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden="true" />
                  <span className="text-ink-2">{t(`status.${s}`)}</span>
                  <b className="tabular">{digits(o.byStatus[s] ?? 0, locale)}</b>
                  <span className="text-ink-3">({digits(Math.round(((o.byStatus[s] ?? 0) / statusTotal) * 100), locale)}%)</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="flex animate-rise flex-col gap-4 p-6 lg:col-span-5 [animation-delay:240ms]">
          <h2 className="text-lg font-bold">{t("overview.signups")}</h2>
          <div className="flex h-44 items-end gap-3 border-b border-line pb-px">
            {months.map((m) => (
              <div key={m.key} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-paper opacity-0 transition-opacity group-hover:opacity-100">
                  {monthName(m.date)}: {digits(m.n, locale)}
                </span>
                <span
                  className="block w-full origin-bottom animate-[grow_0.8s_ease-out_both] rounded-t-[4px] bg-haram transition-colors group-hover:bg-haram-deep"
                  style={{ height: `${(m.n / maxSignups) * 100}%`, minHeight: m.n ? 6 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 text-center text-[12px] text-ink-3">
            {months.map((m) => (
              <span key={m.key} className="flex-1">
                {monthName(m.date)}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>{t("overview.signups")}</caption>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <th scope="row">{m.key}</th>
                  <td>{m.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="flex animate-rise flex-col gap-3 p-6 lg:col-span-7 [animation-delay:280ms]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{t("overview.attention")}</h2>
            <span className="text-[13px] text-ink-3">
              {t("overview.trialsSoon")}: {digits(o.trialsEndingSoon, locale)} · {t("overview.trialsExpired")}: {digits(o.trialsExpired, locale)}
            </span>
          </div>
          {attention.length === 0 ? (
            <p className="text-ink-3">{t("overview.noAttention")}</p>
          ) : (
            <ul className="flex flex-col">
              {attention.map((a) => {
                const expired = a.status === "trial" && a.trial_ends_at && new Date(a.trial_ends_at).getTime() < now;
                return (
                  <li key={a.id} className="border-t border-[#eef3f2] first:border-t-0">
                    <Link href={`/admin/agencies/${a.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:text-haram">
                      <b className="flex-1">{a.name}</b>
                      <Badge tone={a.status === "trial" && !expired ? "pending" : "due"}>
                        {expired ? t("status.expired") : t(`status.${a.status ?? "none"}`)}
                      </Badge>
                      {a.trial_ends_at ? <span className="text-[13px] text-ink-3">{dateText(a.trial_ends_at, locale)}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="animate-rise overflow-hidden [animation-delay:320ms]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold">{t("overview.recent")}</h2>
          <Link href="/admin/agencies" className="text-sm font-semibold text-haram">
            {t("nav.agencies")} →
          </Link>
        </div>
        <ul>
          {recent.map((a) => (
            <li key={a.id} className="border-t border-[#eef3f2]">
              <Link href={`/admin/agencies/${a.id}`} className="flex flex-wrap items-center gap-4 px-6 py-3.5 hover:bg-field">
                <span className="flex h-10 w-9 items-center justify-center rounded-[18px_18px_8px_8px] bg-haram-tint">
                  <Khatam className="h-5 w-5 text-haram" strokeWidth={8} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate">{a.name}</b>
                  <span className="truncate text-[13px] text-ink-3">{a.owner?.email ?? a.slug}</span>
                </span>
                <span className="text-sm text-ink-2">{locale === "bn" ? a.plan_name_bn : a.plan_name_en}</span>
                <span className="text-[13px] text-ink-3">{dateText(a.created_at, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </PageBody>
  );
}
