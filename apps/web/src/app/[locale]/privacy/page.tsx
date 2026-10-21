import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { Link } from "@/i18n/navigation";
import { dateText, digits, type Locale } from "@/lib/format";
import { POLICY, UPDATED } from "./content";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const p = POLICY[locale];
  return { title: { absolute: `${p.title} · Hajj Tracking` }, description: p.intro };
}

/** Public, readable by anyone, linked from sign-up, the forms on agency websites and the Play Store listing. */
export default async function PrivacyPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const p = POLICY[locale];
  const contact = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/70 bg-ground/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <b className="whitespace-nowrap">{locale === "bn" ? "হজ ট্র্যাকিং" : "Hajj Tracking"}</b>
          </Link>
          <Link href="/privacy" locale={locale === "bn" ? "en" : "bn"} className="rounded-md px-3 py-2 text-[15px] font-semibold text-ink-2 hover:bg-paper">
            {locale === "bn" ? "EN" : "বাংলা"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-10 pb-20 sm:px-8">
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-[40px] leading-[1.12] sm:text-5xl">{p.title}</h1>
          <p className="text-[18px] leading-relaxed text-ink-2">{p.intro}</p>
          <p className="text-[14px] text-ink-3">
            {p.updated}: {dateText(UPDATED, locale)}
          </p>
        </section>

        <nav aria-label={p.contents} className="rounded-[20px] bg-paper p-5">
          <h2 className="mb-3 text-[15px] font-bold">{p.contents}</h2>
          <ol className="grid gap-1.5 text-[15px] sm:grid-cols-2">
            {p.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-haram underline-offset-4 hover:underline">
                  {digits(i + 1, locale)}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {p.sections.map((s, i) => {
          const items = s.body.filter((b) => b.startsWith("• "));
          return (
            <section key={s.id} id={s.id} className="flex scroll-mt-6 flex-col gap-3 border-t border-line pt-6">
              <h2 className="text-2xl font-bold">
                <span className="text-haram">{digits(i + 1, locale)}.</span> {s.title}
              </h2>
              {s.body
                .filter((b) => !b.startsWith("• "))
                .slice(0, 1)
                .map((b) => (
                  <p key={b} className="text-[17px] leading-relaxed text-ink-2">
                    {b}
                  </p>
                ))}
              {items.length ? (
                <ul className="flex list-disc flex-col gap-2 ps-6 text-[17px] leading-relaxed text-ink-2 marker:text-haram">
                  {items.map((b) => (
                    <li key={b}>{b.slice(2)}</li>
                  ))}
                </ul>
              ) : null}
              {s.body
                .filter((b) => !b.startsWith("• "))
                .slice(1)
                .map((b) => (
                  <p key={b} className="text-[17px] leading-relaxed text-ink-2">
                    {b}
                  </p>
                ))}
            </section>
          );
        })}

        <section id="contact" className="flex flex-col gap-3 rounded-[20px] border-l-[6px] border-l-saffron bg-paper px-5 py-4">
          <h2 className="text-xl font-bold">{p.contactTitle}</h2>
          <p className="text-[17px] leading-relaxed text-ink-2">
            {contact ? (
              <>
                {p.contactLead}
                <a href={`mailto:${contact}`} className="font-semibold text-haram underline underline-offset-4">
                  {contact}
                </a>
              </>
            ) : (
              p.contactWithout
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
