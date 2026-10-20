const TZ = "Asia/Dhaka";

/**
 * The next Day of Arafah (9 Dhul Hijjah) by the Umm al-Qura calendar, and how
 * many days away it is. Moon sighting can move it by a day or two.
 */
export function nextArafah(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric" });
  for (let i = 0; i < 400; i++) {
    const date = new Date(now.getTime() + i * 864e5);
    const parts = fmt.formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    if (get("month") === 12 && get("day") === 9) return { date, days: i, year: get("year") };
  }
  return null;
}

/** "৯ জিলহজ ১৪৪৮" / "9 Dhuʻl-Hijjah 1448", without the era label. */
export function hijriDate(date: Date, locale: "bn" | "en") {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD-u-ca-islamic-umalqura" : "en-GB-u-ca-islamic-umalqura", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" })
    .formatToParts(date)
    .filter((p) => p.type !== "era" && p.type !== "literal")
    .map((p) => p.value)
    .join(" ");
}
