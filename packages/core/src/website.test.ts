import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  looksLikeSpam,
  normalizeSections,
  postSlug,
  SITE_SECTIONS,
  siteSlugError,
  siteTheme,
  themeFromColor,
  THEME_KEYS,
  THEMES,
} from "./website";

describe("normalizeSections", () => {
  it("keeps the saved order, drops junk and appends new sections", () => {
    const out = normalizeSections([
      { id: "faq", visible: false },
      { id: "nope", visible: true },
      { id: "packages" },
      { id: "faq", visible: true },
    ]);
    expect(out.slice(0, 2)).toEqual([
      { id: "faq", visible: false },
      { id: "packages", visible: true },
    ]);
    expect(out.map((s) => s.id).sort()).toEqual([...SITE_SECTIONS].sort());
    expect(normalizeSections(null).map((s) => s.id)).toEqual([...SITE_SECTIONS]);
  });
});

describe("themes", () => {
  it("gives white text at least 4.5:1 on every preset", () => {
    for (const key of THEME_KEYS) {
      const t = themeFromColor(THEMES[key].primary);
      expect(contrastRatio(t.primary, "#ffffff"), key).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.night, "#ffffff"), key).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.nightMuted, t.night), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("darkens a custom colour that is too light to read on", () => {
    const t = themeFromColor("#ffe066");
    expect(contrastRatio(t.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(themeFromColor("not-a-colour").primary).toBe(THEMES.zamzam.primary);
  });

  it("prefers a custom colour over the preset", () => {
    expect(siteTheme("night", "#9b2d4b").primary).toBe("#9b2d4b");
    expect(siteTheme("night").primary).toBe(THEMES.night.primary);
    expect(siteTheme("missing").primary).toBe(THEMES.zamzam.primary);
  });
});

describe("siteSlugError", () => {
  it("accepts tidy addresses and refuses the rest", () => {
    expect(siteSlugError("al-madina-travels")).toBeNull();
    expect(siteSlugError("ab")).toBe("SLUG_FORMAT");
    expect(siteSlugError("Bad Name")).toBe("SLUG_FORMAT");
    expect(siteSlugError("-edge")).toBe("SLUG_FORMAT");
    expect(siteSlugError("double--dash")).toBe("SLUG_FORMAT");
    expect(siteSlugError("admin")).toBe("SLUG_RESERVED");
  });
});

describe("looksLikeSpam", () => {
  it("flags links and handles, not ordinary praise", () => {
    expect(looksLikeSpam("আলহামদুলিল্লাহ, খুব ভালো ব্যবস্থা ছিল")).toBe(false);
    expect(looksLikeSpam("Great trip, thanks to the whole team!")).toBe(false);
    expect(looksLikeSpam("cheap visa at www.example.com")).toBe(true);
    expect(looksLikeSpam("call me https://t.me/x")).toBe(true);
  });
});

describe("postSlug", () => {
  it("uses the English title when there is one", () => {
    expect(postSlug("Hajj 2027 registration is open!", "a1b2")).toBe("hajj-2027-registration-is-open-a1b2");
    expect(postSlug("২০২৭ হজের নিবন্ধন শুরু", "a1b2")).toBe("2027-a1b2");
    expect(postSlug("নিবন্ধন", "a1b2")).toBe("post-a1b2");
  });
});
