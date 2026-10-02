import type { ReactNode } from "react";
import { Khatam } from "./ui";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-marble lg:flex lg:flex-col lg:justify-between">
        <Khatam className="h-10 w-10 text-gold-light" />
        <Khatam className="absolute -right-24 -bottom-24 h-[420px] w-[420px] text-[#2e3138]" strokeWidth={1} />
        <p className="relative max-w-sm font-display text-4xl leading-tight">লাব্বাইক আল্লাহুম্মা লাব্বাইক</p>
      </aside>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-md flex-col gap-8">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
