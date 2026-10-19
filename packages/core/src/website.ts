/**
 * An agency's public website: which sections it shows and in what order, its
 * colour theme, its address on this platform, and the checks applied to
 * what visitors send in.
 */

/** Sections below the hero, in their default order. */
export const SITE_SECTIONS = ["highlights", "packages", "posts", "gallery", "reviews", "steps", "duas", "faq", "contact"] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];

export interface SectionSetting {
  id: SiteSection;
  visible: boolean;
}

/**
 * The saved order, cleaned: unknown or repeated entries dropped, and any
 * section added since it was saved appended (shown) at the end.
 */
export function normalizeSections(saved: unknown): SectionSetting[] {
  const out: SectionSetting[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    for (const entry of saved) {
      const id = (entry as { id?: unknown })?.id;
      if (typeof id !== "string" || seen.has(id) || !(SITE_SECTIONS as readonly string[]).includes(id)) continue;
      seen.add(id);
      out.push({ id: id as SiteSection, visible: (entry as { visible?: unknown }).visible !== false });
    }
  }
  for (const id of SITE_SECTIONS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}

/* ------------------------------------------------------------------ colours */

export interface ThemeColors {
  /** Buttons, links, headings accents. White text on it meets WCAG AA. */
  primary: string;
  /** Pressed / hover state of primary. */
  deep: string;
  /** Dark bands (features, duas, contact card). */
  night: string;
  /** A slightly lighter shade inside the dark bands (cards, badges). */
  nightRaised: string;
  /** Borders on the dark bands. */
  nightLine: string;
  /** Secondary text on the dark bands. */
  nightMuted: string;
  /** Pale wash behind icons and chips. */
  tint: string;
  /** Barely-there wash for large decorations. */
  mist: string;
}

/** Curated themes. Each name is what the agency sees in the picker. */
export const THEMES = {
  zamzam: { bn: "জমজম সবুজ", en: "Zamzam teal", primary: "#0b7a6f" },
  madina: { bn: "মদিনার সবুজ", en: "Madinah green", primary: "#1f7a3a" },
  night: { bn: "রাতের আকাশ", en: "Night sky", primary: "#24508f" },
  dates: { bn: "খেজুর বাদামি", en: "Date brown", primary: "#8a4b22" },
  rose: { bn: "আরবি গোলাপ", en: "Arabian rose", primary: "#9b2d4b" },
  olive: { bn: "জলপাই", en: "Olive", primary: "#5d6b1f" },
  slate: { bn: "পাথর ধূসর", en: "Kaaba stone", primary: "#3f5566" },
} as const;
export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` of `b` mixed into `a`. */
function mix(a: string, b: string, amount: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * amount) as [number, number, number]);
}

function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Every shade the website needs, worked out from one colour. A colour too
 * light for white text is darkened step by step until white text on it reads
 * at 4.5:1, so an agency can pick any colour without making the site hard to read.
 */
export function themeFromColor(color: string): ThemeColors {
  let primary = isHexColor(color) ? color.toLowerCase() : THEMES.zamzam.primary;
  for (let i = 0; i < 20 && contrastRatio(primary, "#ffffff") < 4.5; i++) primary = mix(primary, "#000000", 0.08);
  const night = mix(primary, "#000000", 0.38);
  return {
    primary,
    deep: mix(primary, "#000000", 0.22),
    night,
    nightRaised: mix(night, primary, 0.45),
    nightLine: mix(night, "#ffffff", 0.16),
    nightMuted: mix(primary, "#ffffff", 0.7),
    tint: mix(primary, "#ffffff", 0.86),
    mist: mix(primary, "#ffffff", 0.94),
  };
}

/** The colours for a saved theme: a custom colour wins over the preset. */
export function siteTheme(theme: string | null | undefined, customColor?: string | null): ThemeColors {
  if (customColor && isHexColor(customColor)) return themeFromColor(customColor);
  const preset = THEMES[(theme ?? "zamzam") as ThemeKey] ?? THEMES.zamzam;
  return themeFromColor(preset.primary);
}

/* ------------------------------------------------------------------ address */

/** Words that would collide with the platform's own pages or mislead visitors. */
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "site", "sites", "www", "mail", "login", "sign-in", "sign-up", "signin", "signup",
  "onboarding", "verify", "dev", "help", "support", "about", "official", "takatracker", "hajj", "umrah",
  "government", "gov", "ministry", "dhaka", "bangladesh", "saudi", "nusuk", "static", "assets", "media",
]);

/** Why a website address can't be used, or null when it can. 3–40 of a–z, 0–9 and inner hyphens. */
export function siteSlugError(slug: string): "SLUG_FORMAT" | "SLUG_RESERVED" | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) || slug.includes("--")) return "SLUG_FORMAT";
  if (RESERVED_SLUGS.has(slug)) return "SLUG_RESERVED";
  return null;
}

/* -------------------------------------------------------- what visitors send */

/** Links and contact details in a public review are how spam gets in; reviews carry none. */
export function looksLikeSpam(text: string): boolean {
  return /(https?:\/\/|www\.|\.(com|net|org|xyz|top|bd)\b|@[a-z0-9-]+\.|t\.me\/|wa\.me\/)/i.test(text);
}

export const POST_KINDS = ["news", "notice", "offer"] as const;
export type PostKind = (typeof POST_KINDS)[number];

/** A URL-safe address for a post, from its title; Bangla titles fall back to a short random tail. */
export function postSlug(title: string, tail: string): string {
  const base = title
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return base ? `${base}-${tail}` : `post-${tail}`;
}
