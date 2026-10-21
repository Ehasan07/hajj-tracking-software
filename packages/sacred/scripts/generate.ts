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
  // The guide book: Ayat al-Kursi, the close of al-Baqarah, and the short surahs recited in prayer.
  "2:255", "2:285", "2:286",
  // The command to send blessings on the Prophet.
  "33:56",
  ...surah(102, 8), ...surah(103, 3), ...surah(104, 9), ...surah(105, 5), ...surah(106, 4), ...surah(107, 7),
  ...surah(108, 3), ...surah(110, 3), ...surah(111, 5), ...surah(113, 5), ...surah(114, 6),
];

/**
 * Words cut from one ayah, verbatim, for phrases made of Quranic parts: the
 * two halves of the kalimah tayyibah are in 47:19 and 48:29.
 */
const AYAH_PARTS = [
  { id: "tayyibah_tawhid", ref: "47:19", start: "لا اله الا الله", end: "الا الله" },
  { id: "tayyibah_risalah", ref: "48:29", start: "محمد رسول الله", end: "رسول الله" },
];

function surah(n: number, ayat: number): string[] {
  return Array.from({ length: ayat }, (_, i) => `${n}:${i + 1}`);
}

type Book = "bukhari" | "muslim" | "abudawud" | "tirmidhi" | "ibnmajah";

interface HadithSpec {
  id: string;
  book: Book;
  /** Standard hadith number (Bukhari/Abu Dawud/Tirmidhi numbering; Muslim by Fuad Abd al-Baqi). */
  number: string;
  /** In-book reference as shown on sunnah.com. Read from the source; when given here it is checked against it. */
  inBook?: string;
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

  // ------------------------------------------------- the guide book: prayer
  { id: "takbir", book: "abudawud", number: "730", key: "الله اكبر", start: "الله اكبر", end: "الله اكبر" },
  { id: "sana", book: "tirmidhi", number: "242", key: "وتعالى جدك ولا اله غيرك", start: "سبحانك اللهم", end: "ولا اله غيرك" },
  { id: "taawwuz", book: "bukhari", number: "6115", key: "اعوذ بالله من الشيطان الرجيم", start: "اعوذ بالله من الشيطان الرجيم", end: "اعوذ بالله من الشيطان الرجيم" },
  { id: "ruku", book: "muslim", number: "772", key: "سبحان ربي العظيم", start: "سبحان ربي العظيم", end: "سبحان ربي العظيم" },
  { id: "tasmi", book: "bukhari", number: "796", key: "فقولوا اللهم ربنا لك الحمد", start: "سمع الله لمن حمده", end: "سمع الله لمن حمده" },
  { id: "tahmid", book: "bukhari", number: "796", key: "فقولوا اللهم ربنا لك الحمد", start: "اللهم ربنا لك الحمد", end: "اللهم ربنا لك الحمد" },
  { id: "sujud", book: "muslim", number: "772", key: "سبحان ربي العظيم", start: "سبحان ربي الاعلى", end: "سبحان ربي الاعلى" },
  { id: "jalsa", book: "abudawud", number: "850", key: "اللهم اغفر لي وارحمني وعافني واهدني وارزقني", start: "اللهم اغفر لي", end: "وارزقني" },
  { id: "tashahhud", book: "bukhari", number: "1202", key: "التحيات لله والصلوات والطيبات", start: "التحيات لله", end: "عبده ورسوله" },
  { id: "durud", book: "bukhari", number: "3370", key: "كما صليت على ابراهيم", start: "اللهم صل على محمد", end: "باركت على ابراهيم، وعلى ال ابراهيم، انك حميد مجيد" },
  { id: "masura", book: "bukhari", number: "6326", key: "ظلمت نفسي ظلما كثيرا", start: "اللهم اني ظلمت نفسي", end: "الغفور الرحيم" },
  { id: "salam", book: "abudawud", number: "996", key: "السلام عليكم ورحمة الله", start: "السلام عليكم ورحمة الله", end: "السلام عليكم ورحمة الله" },
  { id: "qunut", book: "abudawud", number: "1425", key: "اللهم اهدني فيمن هديت", start: "اللهم اهدني فيمن هديت", end: "تباركت ربنا وتعاليت" },
  { id: "after_salah", book: "muslim", number: "591", key: "اللهم انت السلام ومنك السلام", start: "اللهم انت السلام", end: "والاكرام" },
  { id: "tasbih_fatimah", book: "muslim", number: "597", key: "من سبح الله في دبر كل صلاة", start: "من سبح الله", end: "زبد البحر" },
  { id: "adhan_dua", book: "bukhari", number: "614", key: "رب هذه الدعوة التامة", start: "اللهم رب هذه الدعوة", end: "الذي وعدته" },
  { id: "wudu_after", book: "muslim", number: "234", key: "اشهد ان لا اله الا الله وحده لا شريك له واشهد ان محمدا عبده ورسوله", start: "اشهد ان لا اله الا الله وحده", end: "عبده ورسوله" },
  { id: "wudu_after_extra", book: "tirmidhi", number: "55", key: "اللهم اجعلني من التوابين", start: "اللهم اجعلني من التوابين", end: "المتطهرين" },
  { id: "ayatul_kursi_virtue", book: "bukhari", number: "5010", key: "اذا اويت الى فراشك فاقرا اية الكرسي", start: "اذا اويت الى فراشك", end: "حتى تصبح" },

  // ------------------------------------------- the guide book: kalimah and salawat
  { id: "tamjid", book: "ibnmajah", number: "3878", key: "ولا حول ولا قوة الا بالله العلي العظيم", start: "سبحان الله والحمد لله", end: "العلي العظيم" },
  { id: "durud_virtue", book: "muslim", number: "408", key: "من صلى علي واحدة", start: "من صلى علي واحدة", end: "عليه عشرا" },

  // ---------------------------------------------- the guide book: every day
  { id: "eat_start", book: "abudawud", number: "3767", key: "بسم الله اوله واخره", start: "بسم الله", end: "بسم الله" },
  { id: "eat_forgot", book: "abudawud", number: "3767", key: "بسم الله اوله واخره", start: "بسم الله اوله", end: "واخره" },
  { id: "eat_end", book: "abudawud", number: "4023", key: "ورزقنيه من غير حول مني", start: "الحمد لله الذي", end: "ولا قوة" },
  { id: "sleep", book: "bukhari", number: "6324", key: "باسمك اللهم اموت واحيا", start: "باسمك اللهم اموت واحيا", end: "باسمك اللهم اموت واحيا" },
  { id: "wake", book: "bukhari", number: "6324", key: "باسمك اللهم اموت واحيا", start: "الحمد لله الذي احيانا", end: "النشور" },
  { id: "home_leave", book: "abudawud", number: "5095", key: "توكلت على الله لا حول ولا قوة الا بالله", start: "بسم الله توكلت", end: "الا بالله" },
  { id: "toilet_enter", book: "bukhari", number: "142", key: "اعوذ بك من الخبث والخبائث", start: "اللهم اني اعوذ بك", end: "والخبائث" },
  { id: "toilet_exit", book: "abudawud", number: "30", key: "غفرانك", start: "غفرانك", end: "غفرانك" },

  // -------------------------------------- the guide book: Hajj and Madinah
  { id: "maqam", book: "muslim", number: "1218", key: "انجز وعده", start: "واتخذوا من مقام ابراهيم", end: "مصلى" },
  { id: "zamzam", book: "ibnmajah", number: "3062", key: "ماء زمزم لما شرب له", start: "ماء زمزم لما شرب له", end: "ماء زمزم لما شرب له" },
  { id: "sacrifice", book: "muslim", number: "1966", key: "والله اكبر", start: "باسم الله والله اكبر", end: "باسم الله والله اكبر" },
  { id: "halq", book: "bukhari", number: "1727", key: "اللهم ارحم المحلقين", start: "اللهم ارحم المحلقين", end: "اللهم ارحم المحلقين" },
  { id: "salam_prophet", book: "bukhari", number: "1202", key: "التحيات لله والصلوات والطيبات", start: "السلام عليك ايها النبي", end: "وبركاته" },
  { id: "baqi", book: "muslim", number: "975", key: "السلام عليكم اهل الديار", start: "السلام عليكم اهل الديار", end: "العافية" },
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

/** Every mark of the Uthmani text that isn't a letter: vowels, maddah, small letters, pause signs. */
const QURAN_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

/** Cut words out of an ayah of the Uthmani text, matched on letters alone; the words come out exactly as written. */
function quranCut(text: string, start: string, end: string): string | null {
  const kept: string[] = [];
  const index: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (QURAN_MARKS.test(ch)) continue;
    kept.push(ch.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي"));
    index.push(i);
  }
  const sk = kept.join("");
  const a = sk.indexOf(letters(start));
  if (a < 0) return null;
  const b0 = sk.indexOf(letters(end), a);
  if (b0 < 0) return null;
  let stop = index[b0 + letters(end).length - 1]! + 1;
  while (stop < text.length && QURAN_MARKS.test(text[stop]!)) stop++;
  return text.slice(index[a], stop).trim();
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
  const parts: Record<string, { ref: string; text: string }> = {};
  for (const p of AYAH_PARTS) {
    const text = quranCut(lines.get(p.ref) ?? "", p.start, p.end);
    if (!text) throw new Error(`${p.id}: words not found in ${p.ref}`);
    parts[p.id] = { ref: p.ref, text };
  }
  writeFileSync(
    out("quran.ts"),
    `/* eslint-disable */\n// GENERATED by scripts/generate.ts. Do not edit by hand.\n//\n${header
      .split("\n")
      .map((l) => `//${l.slice(1)}`)
      .join("\n")}\n//\n// Source: https://tanzil.net\n\n` +
      `/** Verbatim Tanzil Uthmani text. Surahs other than al-Fatihah carry the basmalah before ayah 1. */\n` +
      `export const AYAT: Record<string, string> = ${JSON.stringify(ayat, null, 2)};\n\n` +
      `/** Words cut verbatim from one ayah of the same text (see AYAH_PARTS in scripts/generate.ts). */\n` +
      `export const AYAH_PARTS: Record<string, { ref: string; text: string }> = ${JSON.stringify(parts, null, 2)};\n`,
  );

  // Hadith (two independent copies must agree)
  const books = [...new Set(HADITH.map((h) => h.book))];
  const A = new Map<Book, { hadithnumber: number; arabicnumber?: string | number; text: string; reference?: { book: number; hadith: number } }[]>();
  const B = new Map<Book, { arabic: string }[]>();
  for (const book of books) {
    A.set(book, (await json<{ hadiths: { hadithnumber: number; arabicnumber?: string | number; text: string; reference?: { book: number; hadith: number } }[] }>(HADITH_A(book))).hadiths);
    B.set(book, (await json<{ hadiths: { arabic: string }[] }>(HADITH_B(book))).hadiths);
  }
  const hadith: Record<string, { text: string; book: Book; number: string; inBook: string; corrections: { from: string; to: string; note: string }[] }> = {};
  for (const spec of HADITH) {
    const key = letters(spec.key);
    // The hadith with the cited number (Muslim by Fuad Abd al-Baqi's numbering), so the citation is exact.
    const number = (h: { hadithnumber: number; arabicnumber?: string | number }) =>
      spec.book === "muslim" ? String(Math.floor(Number(h.arabicnumber))) : String(h.hadithnumber);
    const fromA = A.get(spec.book)!.find((h) => number(h) === spec.number && skeleton(h.text).text.includes(key));
    const a = fromA && cut(fromA.text, spec.start, spec.end);
    // The second copy is numbered differently; any narration in it with the same words letter for letter will do.
    const fromB = B.get(spec.book)!.find((h) => skeleton(h.arabic).text.includes(key) && cut(h.arabic, spec.start, spec.end) === a);
    const b = fromB && cut(fromB.arabic, spec.start, spec.end);
    if (!a || !b) throw new Error(`${spec.id}: not found in both sources`);
    if (a !== b) throw new Error(`${spec.id}: sources differ\nA: ${a}\nB: ${b}`);
    let text = a;
    for (const c of spec.corrections ?? []) {
      if (!text.includes(c.from)) throw new Error(`${spec.id}: correction target missing`);
      text = text.replace(c.from, c.to);
    }
    const inBook = fromA!.reference ? `${fromA!.reference.book}:${fromA!.reference.hadith}` : (spec.inBook ?? "");
    if (spec.inBook && spec.inBook !== inBook) console.warn(`${spec.id}: in-book reference ${spec.inBook} here, ${inBook} in the source`);
    hadith[spec.id] = { text, book: spec.book, number: spec.number, inBook, corrections: spec.corrections ?? [] };
  }
  writeFileSync(
    out("hadith.ts"),
    `/* eslint-disable */\n// GENERATED by scripts/generate.ts. Do not edit by hand.\n// Cut from two independent copies of the collections (fawazahmed0/hadith-api and\n// AhmedBaset/hadith-json, both from sunnah.com); every phrase matched letter for letter.\n\n` +
      `export type HadithBook = "bukhari" | "muslim" | "abudawud" | "tirmidhi" | "ibnmajah";\n\n` +
      `export const HADITH: Record<string, { text: string; book: HadithBook; number: string; inBook: string; corrections: { from: string; to: string; note: string }[] }> = ${JSON.stringify(hadith, null, 2)};\n`,
  );
  console.info(`Wrote ${Object.keys(ayat).length} ayat, ${Object.keys(parts).length} ayah parts and ${Object.keys(hadith).length} hadith phrases`);
}

await main();
