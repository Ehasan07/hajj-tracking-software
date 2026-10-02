import type { ReactNode } from "react";
import { getItem } from "@hajj/sacred";
import { LabbaikOrnament, StarDivider } from "./sacred";
import { Khatam } from "./ui";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-haram-night p-12 text-ground lg:flex lg:flex-col lg:justify-between">
        <span className="flex h-14 w-12 items-center justify-center rounded-[24px_24px_10px_10px] bg-haram">
          <Khatam className="h-8 w-8 text-saffron" strokeWidth={7} />
        </span>
        <Khatam
          className="absolute -right-32 -bottom-32 h-[520px] w-[520px] animate-turn text-[#14635d]"
          strokeWidth={0.8}
        />
        <LabbaikOrnament className="pointer-events-none absolute top-24 -left-6 text-[200px] text-[#14635d]" />
        <div className="relative flex flex-col gap-5">
          <p lang="ar" dir="rtl" className="font-naskh text-[34px] leading-[1.9] text-ground">
            {getItem("dua_talbiyah").verses[0]!.arabic}
          </p>
          <StarDivider className="text-saffron" />
          <p className="max-w-sm font-display text-3xl leading-tight text-[#c7ddd9]">লাব্বাইক আল্লাহুম্মা লাব্বাইক</p>
          <svg viewBox="0 0 200 18" className="h-4 w-56" aria-hidden="true">
            <path
              d="M3 12 C 50 3, 100 16, 197 7"
              fill="none"
              stroke="var(--color-saffron)"
              strokeWidth="5"
              strokeLinecap="round"
              className="[stroke-dasharray:220] [stroke-dashoffset:220] animate-[draw_0.9s_0.4s_ease-out_forwards]"
            />
          </svg>
        </div>
      </aside>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-md animate-rise flex-col gap-8">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
