import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { keyFor, keyLabel, periodOf, qs, shiftKey, type Period } from "@/lib/period";
import { ChevronIcon } from "./icons";

/**
 * Step through days, months or years: ‹ previous · label · next ›, a jump to
 * today, and (optionally) a switch between day, month and year.
 */
export async function PeriodNav({
  base,
  keyName = "key",
  value,
  today,
  locale,
  extra = {},
  periods,
}: {
  base: string;
  keyName?: string;
  value: string;
  today: string;
  locale: Locale;
  extra?: Record<string, string | undefined>;
  periods?: Period[];
}) {
  const t = await getTranslations("period");
  const period = periodOf(value);
  const href = (key: string) => `${base}${qs({ ...extra, [keyName]: key })}`;
  const next = shiftKey(value, 1);
  const current = keyFor(period, today);
  const atLatest = next > current;

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      {periods ? (
        <div className="flex gap-1 rounded-md bg-paper p-1">
          {periods.map((p) => (
            <Link
              key={p}
              href={href(keyFor(p, period === "day" ? value : today))}
              aria-current={p === period ? "page" : undefined}
              className={`flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold ${p === period ? "bg-haram text-white" : "text-ink-2 hover:bg-ground"}`}
            >
              {t(p)}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-1 rounded-md bg-paper p-1">
        <Link
          href={href(shiftKey(value, -1))}
          aria-label={t("previous")}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-ground"
        >
          <ChevronIcon dir="left" size={20} />
        </Link>
        <span className="min-w-44 px-2 text-center text-[15px] font-semibold">
          {keyLabel(value, locale)}
        </span>
        {atLatest ? (
          <span
            className="flex h-10 w-10 items-center justify-center text-line-strong"
            aria-hidden="true"
          >
            <ChevronIcon size={20} />
          </span>
        ) : (
          <Link
            href={href(next)}
            aria-label={t("next")}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-ground"
          >
            <ChevronIcon size={20} />
          </Link>
        )}
      </div>
      {value !== current ? (
        <Link
          href={href(current)}
          className="text-sm font-semibold text-haram underline underline-offset-4"
        >
          {t(period === "day" ? "today" : period === "month" ? "thisMonth" : "thisYear")}
        </Link>
      ) : null}
    </div>
  );
}
