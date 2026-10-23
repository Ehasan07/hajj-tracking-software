import { getTranslations, setRequestLocale } from "next-intl/server";
import { BOOK, getItem, needsRecording, STEPS } from "@hajj/sacred";
import { PageBody, PageHeader } from "@/components/page-header";
import { ArabicText } from "@/components/sacred";
import { Card } from "@/components/ui";
import { digits, type Locale } from "@/lib/format";
import { api } from "@/trpc/server";
import { RecordingRow } from "./recording-row";

/** Every guide item without a Quran recitation, in the book's order, chapter by chapter. */
function recordableByChapter() {
  const seen = new Set<string>();
  return BOOK.map((chapter) => {
    const ids = chapter.blocks.flatMap((b) =>
      b.kind === "items"
        ? b.items
        : b.kind === "sequence"
          ? b.steps.flatMap((s) => s.items)
          : b.kind === "journey"
            ? STEPS.filter((s) => s.phase === b.phase).flatMap((s) => s.items)
            : [],
    );
    const items = ids.filter((id) => needsRecording(id) && !seen.has(id) && seen.add(id)).map(getItem);
    return { id: chapter.id, title: chapter.title, items };
  }).filter((c) => c.items.length > 0);
}

export default async function AdminRecordingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.recordings");
  const recordings = new Map((await (await api()).platform.recordings()).map((r) => [r.itemId, r]));
  const chapters = recordableByChapter();
  const total = chapters.reduce((n, c) => n + c.items.length, 0);
  const done = chapters.reduce((n, c) => n + c.items.filter((i) => recordings.has(i.id)).length, 0);

  return (
    <PageBody>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">{t("howTitle")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[15px] text-ink-2">
          {(t.raw("how") as string[]).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-[15px] font-semibold">{t("progress", { done: digits(done, locale), total: digits(total, locale) })}</p>
      </Card>

      {chapters.map((chapter) => (
        <section key={chapter.id} className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{chapter.title[locale]}</h2>
          {chapter.items.map((item) => {
            const rec = recordings.get(item.id);
            return (
              <Card key={item.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b className="text-[17px]">{item.title[locale]}</b>
                  <span className="text-[13px] text-ink-3">{item.citation[locale]}</span>
                </div>
                <ArabicText source={item.verses[0]!.surah > 0 ? "quran" : "hadith"} className="text-[24px] leading-loose">
                  {item.verses.map((v) => v.arabic).join(" ")}
                </ArabicText>
                {item.pronunciation ? <p className="text-[15px] text-ink-2">{item.pronunciation.replace(/\n/g, " ")}</p> : null}
                <RecordingRow
                  itemId={item.id}
                  current={rec ? { reciter: rec.reciter, url: `/api/recording/${rec.itemId}?v=${rec.uploadedAt.getTime()}` } : null}
                />
              </Card>
            );
          })}
        </section>
      ))}
    </PageBody>
  );
}
