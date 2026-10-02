import { AYAT } from "./generated/quran";
import { HADITH } from "./generated/hadith";
import {
  HADITH_BOOK_NAMES,
  ITEMS,
  RECEIPT_ITEM_ID,
  STEPS,
  SUNNAH,
  SURAH_NAMES,
  type SacredItem,
  type Text,
} from "./content";

export * from "./content";

/** The basmalah as it opens every surah except al-Fatihah and at-Tawbah in the Tanzil text. */
const BASMALAH_PREFIX = AYAT["1:1"]! + " ";

export const BASMALAH = AYAT["1:1"]!;
/** First word of the talbiyah, as it appears in the hadith text. Used as a calligraphic ornament. */
export const LABBAIK = HADITH["talbiyah"]!.text.split(" ")[0]!;
/** Single-glyph basmalah (U+FDFD) for headings and printed documents. */
export const BASMALAH_GLYPH = "\uFDFD";

const ARABIC_INDIC = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";

/** End-of-ayah sign (U+06DD); fonts such as Amiri Quran draw the following digits inside it. */
export const AYAH_END = "\u06DD";
/** Rub el hizb (U+06DE), used as a section ornament. */
export const RUB_EL_HIZB = "\u06DE";

export function arabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)]!);
}

export interface ResolvedVerse {
  ref: string;
  surah: number;
  ayah: number;
  arabic: string;
  meaning: Text;
}

export interface ResolvedItem extends Omit<SacredItem, "arabic" | "meaning"> {
  /** Shown above the verses when a surah's first ayah is included. */
  basmalah: boolean;
  verses: ResolvedVerse[];
  citation: Text;
  hadithCorrections: { from: string; to: string; note: string }[];
}

function quranCitation(refs: string[]): Text {
  const [first] = refs;
  const [s] = first!.split(":").map(Number);
  const nums = refs.map((r) => Number(r.split(":")[1]));
  const range = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : String(nums[0]);
  const bnRange = range.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
  const name = SURAH_NAMES[s!]!;
  return { bn: `সূরা ${name.bn}, আয়াত ${bnRange}`, en: `Surah ${name.en}, ${s}:${range}` };
}

export function resolve(item: SacredItem): ResolvedItem {
  const { arabic, meaning, ...rest } = item;
  if (arabic.type === "quran") {
    let basmalah = false;
    const verses = arabic.refs.map((ref, i) => {
      const [surah, ayah] = ref.split(":").map(Number) as [number, number];
      let text = AYAT[ref];
      if (!text) throw new Error(`Unknown ayah ${ref}`);
      if (ayah === 1 && surah !== 1 && surah !== 9 && text.startsWith(BASMALAH_PREFIX)) {
        text = text.slice(BASMALAH_PREFIX.length);
        basmalah = true;
      }
      return { ref, surah, ayah, arabic: text, meaning: { bn: meaning.bn[i] ?? "", en: meaning.en[i] ?? "" } };
    });
    return { ...rest, basmalah, verses, citation: quranCitation(arabic.refs), hadithCorrections: [] };
  }
  const h = HADITH[arabic.id];
  if (!h) throw new Error(`Unknown hadith ${arabic.id}`);
  const book = HADITH_BOOK_NAMES[h.book]!;
  const bnNumber = h.number.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
  return {
    ...rest,
    basmalah: false,
    verses: [{ ref: arabic.id, surah: 0, ayah: 0, arabic: h.text, meaning: { bn: meaning.bn[0] ?? "", en: meaning.en[0] ?? "" } }],
    citation: { bn: `${book.bn} ${bnNumber}`, en: `${book.en} ${h.number}` },
    hadithCorrections: h.corrections,
  };
}

const byId = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ResolvedItem {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown sacred item ${id}`);
  return resolve(item);
}

export function allItems(): ResolvedItem[] {
  return ITEMS.map(resolve);
}

/** A stable "verse of the day" from the featured items, the same for everyone on a given date. */
export function itemOfTheDay(dateKey: string, allowed?: Set<string>): ResolvedItem | null {
  const pool = ITEMS.filter((i) => i.tags.includes("featured") && (!allowed || allowed.has(i.id)));
  if (pool.length === 0) return null;
  let hash = 0;
  for (const ch of dateKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return resolve(pool[hash % pool.length]!);
}

export function receiptItem(): ResolvedItem {
  return getItem(RECEIPT_ITEM_ID);
}

export { HADITH_BOOK_NAMES, ITEMS, STEPS, SUNNAH, SURAH_NAMES };

export const QURAN_ATTRIBUTION = {
  bn: "কোরআনের আরবি পাঠ: Tanzil Project (tanzil.net), Creative Commons Attribution 3.0",
  en: "Quran Arabic text: Tanzil Project (tanzil.net), Creative Commons Attribution 3.0",
  url: "https://tanzil.net",
};
