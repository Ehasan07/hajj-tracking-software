"use client";

import { RECITERS, type ReciterId } from "@hajj/sacred/reciters";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { digits, type Locale } from "@/lib/format";
import { READING_KEY } from "./book-controls";

/**
 * Plays the recitation of the guide's ayat. One player for the whole page:
 * anything with `data-recite="112-1,112-2"` starts those ayat in order when
 * clicked (a play button, or the Arabic itself), and clicking it again stops.
 * While an ayah plays, its button and its row carry `data-playing`, and a bar
 * at the bottom says what is playing.
 *
 * Duas, hadith and the kalimah carry `data-recording="<item>"` instead: when
 * the platform owner has uploaded a qari's recording of that item (listed at
 * /api/recordings), they are switched on as `data-recite="rec:<item>"`.
 */

function reciter(): ReciterId {
  try {
    const id = (JSON.parse(localStorage.getItem(READING_KEY) ?? "null") as { reciter?: string } | null)?.reciter;
    if (RECITERS.some((r) => r.id === id)) return id as ReciterId;
  } catch {
    /* private mode */
  }
  return "husary";
}

interface Queue {
  key: string;
  item: string;
  title: string;
  refs: string[];
  i: number;
}

export function Recitation() {
  const t = useTranslations("book.recite");
  const locale = useLocale() as Locale;
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Queue | null>(null);
  const recordings = useRef<Record<string, { reciter: string; url: string }>>({});
  const [now, setNow] = useState<{ title: string; ref: string; reciter: string } | null>(null);
  const [error, setError] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audio.current = el;

    const mark = () => {
      document.querySelectorAll("[data-playing]").forEach((n) => n.removeAttribute("data-playing"));
      const q = queue.current;
      if (!q) return;
      document.querySelectorAll<HTMLElement>("[data-recite]").forEach((n) => {
        if (n.dataset.recite === q.key && n.dataset.reciteItem === q.item) n.setAttribute("data-playing", "");
      });
      document.querySelectorAll<HTMLElement>("[data-verse]").forEach((n) => {
        if (n.dataset.verse === `${q.item}|${q.refs[q.i]}`) n.setAttribute("data-playing", "");
      });
    };

    const stop = () => {
      el.pause();
      el.removeAttribute("src");
      queue.current = null;
      mark();
      setNow(null);
    };

    const fail = () => {
      stop();
      setError(true);
    };

    const play = () => {
      const q = queue.current;
      if (!q) return;
      const ref = q.refs[q.i]!;
      const recording = ref.startsWith("rec:") ? recordings.current[ref.slice(4)] : undefined;
      const who = reciter();
      el.src = recording ? recording.url : `/api/recitation/${who}/${ref}`;
      el.play().catch((e: unknown) => {
        // A newer click replaced this ayah before it started; that is not a failure.
        if (!(e instanceof DOMException && e.name === "AbortError")) fail();
      });
      mark();
      const name = recording ? recording.reciter : RECITERS.find((r) => r.id === who)!.name[locale];
      setNow({ title: q.title, ref, reciter: name });
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: q.title, artist: name, album: "Hajj Tracking" });
      }
    };

    el.addEventListener("ended", () => {
      const q = queue.current;
      if (q && q.i + 1 < q.refs.length) {
        q.i += 1;
        play();
      } else stop();
    });
    el.addEventListener("error", () => {
      if (queue.current) fail();
    });

    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-recite]");
      if (!target) return;
      // Selecting Arabic text to copy it shouldn't start the recitation.
      if (target.tagName !== "BUTTON" && window.getSelection()?.toString()) return;
      const key = target.dataset.recite!;
      const item = target.dataset.reciteItem ?? "";
      setError(false);
      if (queue.current && queue.current.key === key && queue.current.item === item) {
        stop();
        return;
      }
      queue.current = { key, item, title: target.dataset.reciteTitle ?? "", refs: key.split(","), i: 0 };
      play();
    };

    // Switch on the duas that have a recording.
    fetch("/api/recordings")
      .then((res) => (res.ok ? res.json() : {}))
      .then((list: Record<string, { reciter: string; url: string }>) => {
        recordings.current = list;
        document.querySelectorAll<HTMLElement>("[data-recording]").forEach((n) => {
          const id = n.dataset.recording!;
          if (!list[id]) return;
          n.dataset.recite = `rec:${id}`;
          n.dataset.reciteItem = id;
          n.hidden = false;
        });
      })
      .catch(() => {
        /* offline: the duas stay without a play button */
      });

    stopRef.current = stop;
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      el.pause();
    };
  }, [locale]);

  if (!now && !error) return null;
  const [, ayah] = (now?.ref ?? "").split("-").map(Number);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] print:hidden">
      <div
        role={error ? "alert" : "status"}
        className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-haram-deep px-4 py-3 text-white shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]"
      >
        {now ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
              <span className="block h-3 w-3 animate-pulse rounded-full bg-saffron" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <b className="truncate text-[15px]">
                {now.title}
                {now.ref === "1-1" && now.title ? ` · ${t("basmalah")}` : ayah ? ` · ${t("ayah", { n: digits(ayah, locale) })}` : ""}
              </b>
              <span className="truncate text-[13px] text-white/75">{now.reciter}</span>
            </span>
            <button type="button" onClick={() => stopRef.current()} className="h-10 shrink-0 rounded-full bg-white px-4 text-[14px] font-bold text-haram-deep">
              {t("stop")}
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-[14px]">{t("error")}</span>
            <button type="button" onClick={() => setError(false)} aria-label={t("dismiss")} className="h-9 shrink-0 rounded-full bg-white/15 px-3 text-[13px] font-semibold">
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
