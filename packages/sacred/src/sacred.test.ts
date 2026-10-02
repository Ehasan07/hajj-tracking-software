import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AYAT } from "./generated/quran";
import { allItems, arabicNumber, getItem, ITEMS, itemOfTheDay, receiptItem, STEPS, SUNNAH } from "./index";

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

describe("sacred content", () => {
  it("contains no hand-typed Arabic: every Arabic letter comes from generated sources", () => {
    for (const file of ["content.ts", "index.ts"]) {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(ARABIC.test(text), file).toBe(false);
    }
  });

  it("resolves every item, with a meaning for every verse in both languages", () => {
    for (const item of allItems()) {
      expect(item.verses.length, item.id).toBeGreaterThan(0);
      for (const v of item.verses) {
        expect(ARABIC.test(v.arabic), `${item.id} ${v.ref}`).toBe(true);
        expect(v.meaning.bn.trim(), `${item.id} ${v.ref} bn`).not.toBe("");
        expect(v.meaning.en.trim(), `${item.id} ${v.ref} en`).not.toBe("");
      }
      expect(item.citation.bn).not.toBe("");
    }
  });

  it("has exactly as many meanings as verses", () => {
    for (const item of ITEMS) {
      const count = item.arabic.type === "quran" ? item.arabic.refs.length : 1;
      expect(item.meaning.bn, item.id).toHaveLength(count);
      expect(item.meaning.en, item.id).toHaveLength(count);
    }
  });

  it("gives every item a Bangla pronunciation", () => {
    for (const item of ITEMS) expect(item.pronunciation?.trim(), item.id).toBeTruthy();
  });

  it("gives Quran pronunciation one line per ayah", () => {
    for (const item of ITEMS) {
      if (item.arabic.type !== "quran" || !item.pronunciation) continue;
      expect(item.pronunciation.split("\n"), item.id).toHaveLength(item.arabic.refs.length);
    }
  });

  it("links steps only to items and practices that exist", () => {
    const ids = new Set(ITEMS.map((i) => i.id));
    const practices = new Set(SUNNAH.map((s) => s.id));
    for (const step of STEPS) {
      for (const id of step.items) expect(ids.has(id), `${step.id} → ${id}`).toBe(true);
      for (const id of step.sunnah) expect(practices.has(id), `${step.id} → ${id}`).toBe(true);
    }
  });

  it("splits the basmalah off the first ayah of a surah", () => {
    const ikhlas = getItem("surah_ikhlas");
    expect(ikhlas.basmalah).toBe(true);
    expect(ikhlas.verses[0]!.arabic).toBe(AYAT["112:1"]!.split(" ").slice(4).join(" "));
    const fatihah = getItem("surah_fatihah");
    expect(fatihah.basmalah).toBe(false);
    expect(fatihah.verses).toHaveLength(7);
  });

  it("cites sources in both languages", () => {
    expect(getItem("ayah_first_house").citation).toEqual({ bn: "সূরা আলে ইমরান, আয়াত ৯৬–৯৭", en: "Surah Al Imran, 3:96–97" });
    expect(getItem("dua_talbiyah").citation).toEqual({ bn: "সহিহ বুখারি ১৫৪৯", en: "Sahih al-Bukhari 1549" });
  });

  it("records the one source correction for review", () => {
    expect(getItem("dua_safa_marwah").hadithCorrections).toHaveLength(1);
  });

  it("picks a stable item of the day, only from allowed items", () => {
    expect(itemOfTheDay("2026-10-02")?.id).toBe(itemOfTheDay("2026-10-02")?.id);
    expect(itemOfTheDay("2026-10-02", new Set(["dua_talbiyah"]))?.id).toBe("dua_talbiyah");
    expect(itemOfTheDay("2026-10-02", new Set())).toBeNull();
  });

  it("prints a whole ayah on receipts", () => {
    expect(receiptItem().verses.map((v) => v.ref)).toEqual(["2:127"]);
    expect(arabicNumber(127)).toBe("١٢٧");
  });
});
