import type { ReactNode } from "react";
import { digits, type Locale } from "@/lib/format";

/**
 * Renders the guide's light formatting as React elements (no HTML parsing):
 * "## " heading, "- " bullet, "1. " numbered step, blank line between paragraphs.
 */
export function ArticleBody({ text, locale }: { text: string; locale: Locale }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mt-4 flex items-center gap-3 text-xl font-bold first:mt-0">
          <span className="h-5 w-1.5 rounded-full bg-saffron" aria-hidden="true" />
          {line.slice(3)}
        </h2>,
      );
      i++;
      continue;
    }
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i]!)) items.push(lines[i++]!.slice(2));
      blocks.push(
        <ul key={key++} className="flex flex-col gap-2">
          {items.map((item, n) => (
            <li key={n} className="flex gap-3 leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-haram" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\d+\. /, ""));
      blocks.push(
        <ol key={key++} className="flex flex-col gap-3">
          {items.map((item, n) => (
            <li key={n} className="flex gap-4 leading-relaxed">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-haram-tint font-display text-haram-deep">
                {digits(n + 1, locale)}
              </span>
              <span className="pt-1">{item}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(## |- |\d+\. )/.test(lines[i]!)) para.push(lines[i++]!.trim());
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {para.join(" ")}
      </p>,
    );
  }
  return <div className="flex flex-col gap-4 text-[17px]">{blocks}</div>;
}

/** Plain-text preview of an article for cards: formatting marks removed. */
export function articlePreview(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/^(## |- |\d+\. )/, "").trim())
    .filter(Boolean)
    .join(" ");
}
