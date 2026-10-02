/**
 * Builds src/generated/* from published sources. Arabic text is never typed
 * by hand in this repository: every ayah comes verbatim from the Tanzil
 * Uthmani text, and every hadith phrase is cut from two independent copies of
 * the collections and must match letter for letter, diacritics included.
 *
 *   pnpm --filter @hajj/sacred generate
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TANZIL =
  "https://tanzil.net/pub/download/index.php?quranType=uthmani&marks=true&sajdah=true&rub=false&alef=false&outType=txt-2&agree=true";
const HADITH_A = (book: string) => `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book}.min.json`;
const HADITH_B = (book: string) =>
  `https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/the_9_books/${book}.json`;

/** Ayat used across the product, by "surah:ayah". Whole surahs are listed ayah by ayah. */
const AYAT = [
  "1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7",
  "2:127", "2:158", "2:196", "2:197", "2:198", "2:199", "2:201", "2:203",
  "3:96", "3:97",
  "14:37",
  "22:26", "22:27", "22:28", "22:29", "22:32",
  "109:1", "109:2", "109:3", "109:4", "109:5", "109:6",
  "112:1", "112:2", "112:3", "112:4",
];

type Book = "bukhari" | "muslim" | "abudawud" | "tirmidhi";

interface HadithSpec {
  id: string;
  book: Book;
  /** Standard hadith number (Bukhari/Abu Dawud/Tirmidhi numbering; Muslim by Fuad Abd al-Baqi). */
  number: string;
  /** In-book reference as shown on sunnah.com, for checking. */
  inBook: string;
  /** Phrase that identifies the narration. */
  key: string;
  /** Start and end of the quoted words, matched without diacritics. */
  start: string;
  end: string;
  /** Known typos in the source, fixed here. Each one is listed for the scholar's review. */
  corrections?: { from: string; to: string; note: string }[];
}

const HADITH: HadithSpec[] = [
  { id: "talbiyah", book: "bukhari", number: "1549", inBook: "25:35", key: "ان تلبية", start: "لبيك اللهم لبيك", end: "النعمة لك والملك، لا شريك لك" },
  { id: "travel", book: "muslim", number: "1342", inBook: "15:479", key: "اذا استوى على بعيره خارجا", start: "سبحان الذي سخر لنا هذا", end: "في المال والاهل" },
  { id: "travel_return", book: "muslim", number: "1342", inBook: "15:479", key: "اذا استوى على بعيره خارجا", start: "ايبون تائبون", end: "لربنا حامدون" },
  { id: "masjid_enter", book: "muslim", number: "713", inBook: "6:82", key: "اذا دخل احدكم المسجد فليقل", start: "اللهم افتح لي ابواب رحمتك", end: "ابواب رحمتك" },
  { id: "masjid_exit", book: "muslim", number: "713", inBook: "6:82", key: "اذا دخل احدكم المسجد فليقل", start: "اللهم اني اسالك من فضلك", end: "من فضلك" },
  {
    id: "safa_marwah", book: "muslim", number: "1218", inBook: "15:159", key: "انجز وعده",
    start: "لا اله الا الله وحده لا شريك له له الملك", end: "وهزم الاحزاب وحده",
    corrections: [
      {
        // كَلِّ → كُلِّ : fatha (U+064E) on kaf should be damma (U+064F).
        from: "\u0643\u064e\u0644\u0651\u0650",
        to: "\u0643\u064f\u0644\u0651\u0650",
        note: "The source puts a fatha on the kaf of this word; it takes a damma, as in the same phrase in Tirmidhi 3585.",
      },
    ],
  },
  { id: "safa_start", book: "muslim", number: "1218", inBook: "15:159", key: "انجز وعده", start: "ابدا بما بدا الله به", end: "ابدا بما بدا الله به" },
  { id: "arafah", book: "tirmidhi", number: "3585", inBook: "48:216", key: "خير الدعاء دعاء يوم عرفة", start: "لا اله الا الله وحده لا شريك له", end: "على كل شيء قدير" },
  { id: "rukn_yamani", book: "abudawud", number: "1892", inBook: "11:172", key: "ما بين الركنين", start: "ربنا اتنا في الدنيا", end: "عذاب النار" },
  { id: "hajj_mabrur", book: "bukhari", number: "1773", inBook: "26:1", key: "العمرة الى العمرة كفارة", start: "العمرة الى العمرة", end: "الا الجنة" },
  { id: "hajj_reward", book: "bukhari", number: "1521", inBook: "25:9", key: "فلم يرفث ولم يفسق", start: "من حج لله", end: "كيوم ولدته امه" },
];

const HARAKAT = /[ً-ْٰـ]/;
const MARKS = /[‎‏]/g;

function letters(text: string) {
  return text.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
}

/** Text without diacritics, plus a map from each kept character to its index in the original. */
function skeleton(text: string) {
  const out: string[] = [];
  const index: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (HARAKAT.test(ch) || ch === "‎" || ch === "‏") continue;
    out.push(letters(ch));
    index.push(i);
  }
  return { text: out.join(""), index };
}

function cut(text: string, start: string, end: string): string | null {
  const sk = skeleton(text);
  const a = sk.text.indexOf(letters(start));
  if (a < 0) return null;
  const b0 = sk.text.indexOf(letters(end), a + (start === end ? 0 : 1));
  if (b0 < 0) return null;
  const b = b0 + letters(end).length - 1;
  let stop = sk.index[b]! + 1;
  while (stop < text.length && HARAKAT.test(text[stop]!)) stop++;
  return text.slice(sk.index[a], stop).replace(MARKS, "").replace(/\s+/g, " ").trim();
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

async function main() {
  const out = (name: string) => fileURLToPath(new URL(`../src/generated/${name}`, import.meta.url));

  // Quran (Tanzil)
  const raw = await (await fetch(TANZIL)).text();
  const header = raw
    .split("\n")
    .filter((l) => l.startsWith("#"))
    .join("\n");
  if (!header.includes("Tanzil Quran Text")) throw new Error("Tanzil header missing");
  const lines = new Map(
    raw
      .split("\n")
      .filter((l) => /^\d+\|\d+\|/.test(l))
      .map((l) => {
        const [s, a, ...rest] = l.split("|");
        return [`${s}:${a}` as string, rest.join("|").trim()] as const;
      }),
  );
  const ayat: Record<string, string> = {};
  for (const ref of AYAT) {
    const text = lines.get(ref);
    if (!text) throw new Error(`Missing ayah ${ref}`);
    ayat[ref] = text;
  }
  writeFileSync(
    out("quran.ts"),
    `/* eslint-disable */\n// GENERATED by scripts/generate.ts. Do not edit by hand.\n//\n${header
      .split("\n")
      .map((l) => `//${l.slice(1)}`)
      .join("\n")}\n//\n// Source: https://tanzil.net\n\n` +
      `/** Verbatim Tanzil Uthmani text. Surahs other than al-Fatihah carry the basmalah before ayah 1. */\n` +
      `export const AYAT: Record<string, string> = ${JSON.stringify(ayat, null, 2)};\n`,
  );

  // Hadith (two independent copies must agree)
  const books = [...new Set(HADITH.map((h) => h.book))];
  const A = new Map<Book, { hadithnumber: number; text: string }[]>();
  const B = new Map<Book, { arabic: string }[]>();
  for (const book of books) {
    A.set(book, (await json<{ hadiths: { hadithnumber: number; text: string }[] }>(HADITH_A(book))).hadiths);
    B.set(book, (await json<{ hadiths: { arabic: string }[] }>(HADITH_B(book))).hadiths);
  }
  const hadith: Record<string, { text: string; book: Book; number: string; inBook: string; corrections: { from: string; to: string; note: string }[] }> = {};
  for (const spec of HADITH) {
    const key = letters(spec.key);
    const fromA = A.get(spec.book)!.find((h) => skeleton(h.text).text.includes(key));
    const fromB = B.get(spec.book)!.find((h) => skeleton(h.arabic).text.includes(key));
    const a = fromA && cut(fromA.text, spec.start, spec.end);
    const b = fromB && cut(fromB.arabic, spec.start, spec.end);
    if (!a || !b) throw new Error(`${spec.id}: not found in both sources`);
    if (a !== b) throw new Error(`${spec.id}: sources differ\nA: ${a}\nB: ${b}`);
    let text = a;
    for (const c of spec.corrections ?? []) {
      if (!text.includes(c.from)) throw new Error(`${spec.id}: correction target missing`);
      text = text.replace(c.from, c.to);
    }
    hadith[spec.id] = { text, book: spec.book, number: spec.number, inBook: spec.inBook, corrections: spec.corrections ?? [] };
  }
  writeFileSync(
    out("hadith.ts"),
    `/* eslint-disable */\n// GENERATED by scripts/generate.ts. Do not edit by hand.\n// Cut from two independent copies of the collections (fawazahmed0/hadith-api and\n// AhmedBaset/hadith-json, both from sunnah.com); every phrase matched letter for letter.\n\n` +
      `export type HadithBook = "bukhari" | "muslim" | "abudawud" | "tirmidhi";\n\n` +
      `export const HADITH: Record<string, { text: string; book: HadithBook; number: string; inBook: string; corrections: { from: string; to: string; note: string }[] }> = ${JSON.stringify(hadith, null, 2)};\n`,
  );
  console.info(`Wrote ${Object.keys(ayat).length} ayat and ${Object.keys(hadith).length} hadith phrases`);
}

await main();
