"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/icons";

type Part = "ar" | "pr" | "bn" | "en";
const PARTS: Part[] = ["ar", "pr", "bn", "en"];
const SIZES = { s: { body: "15px", ar: "24px" }, m: { body: "17px", ar: "28px" }, l: { body: "20px", ar: "34px" } } as const;
type Size = keyof typeof SIZES;
const KEY = "hajj.book.reading";

interface Prefs {
  size: Size;
  hidden: Part[];
}

function read(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Prefs | null;
    if (raw && raw.size in SIZES && Array.isArray(raw.hidden)) return { size: raw.size, hidden: raw.hidden.filter((p) => PARTS.includes(p)) };
  } catch {
    /* private mode, or nothing saved */
  }
  return { size: "m", hidden: [] };
}

/** Apply reading preferences to the book: text size, and which of Arabic / pronunciation / Bangla / English to show. */
function apply({ size, hidden }: Prefs) {
  const book = document.getElementById("book");
  if (!book) return;
  book.style.setProperty("--book-body", SIZES[size].body);
  book.style.setProperty("--book-ar", SIZES[size].ar);
  for (const part of PARTS) book.dataset[part] = hidden.includes(part) ? "off" : "on";
}

/** Reading settings (remembered on this device) and a search over the whole book. */
export function BookControls() {
  const t = useTranslations("book.controls");
  const [prefs, setPrefs] = useState<Prefs>({ size: "m", hidden: [] });
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    const saved = read();
    setPrefs(saved);
    apply(saved);
  }, []);

  function update(next: Prefs) {
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* not saved; the page still works */
    }
  }

  function search(text: string) {
    setQuery(text);
    const q = text.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll<HTMLElement>("#book [data-search]").forEach((el) => {
      const hit = !q || (el.dataset.search ?? "").includes(q);
      el.hidden = !hit;
      if (hit) shown++;
    });
    // Hide headings of blocks and chapters with nothing left to show.
    document.querySelectorAll<HTMLElement>("#book [data-group]").forEach((group) => {
      group.hidden = Boolean(q) && !group.querySelector("[data-search]:not([hidden])");
    });
    setFound(q ? shown : null);
  }

  const toggle = (part: Part) => {
    const hidden = prefs.hidden.includes(part) ? prefs.hidden.filter((p) => p !== part) : [...prefs.hidden, part];
    // Keep at least one way to read.
    if (hidden.length === PARTS.length) return;
    update({ ...prefs, hidden });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-line bg-paper p-4 print:hidden sm:p-5">
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-12 w-full rounded-full border-[1.5px] border-line-strong bg-field pr-4 pl-12 text-[16px] outline-none focus:border-haram focus:bg-paper"
        />
      </label>
      {found !== null ? (
        <p role="status" className="-mt-2 px-2 text-[14px] text-ink-2">
          {found ? t("found", { n: found }) : t("nothing")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-1" role="group" aria-label={t("size")}>
          {(Object.keys(SIZES) as Size[]).map((size, i) => (
            <button
              key={size}
              type="button"
              aria-pressed={prefs.size === size}
              onClick={() => update({ ...prefs, size })}
              className={`grid h-10 w-10 place-items-center rounded-full font-bold transition-colors ${prefs.size === size ? "bg-haram text-white" : "bg-ground text-ink-2 hover:bg-haram-tint"}`}
              style={{ fontSize: `${14 + i * 3}px` }}
            >
              <span aria-hidden="true">অ</span>
              <span className="sr-only">{t(`sizes.${size}`)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("show")}>
          {PARTS.map((part) => {
            const on = !prefs.hidden.includes(part);
            return (
              <button
                key={part}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(part)}
                className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${on ? "border-haram bg-haram-tint text-haram-deep" : "border-line text-ink-3 line-through"}`}
              >
                {t(`parts.${part}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
