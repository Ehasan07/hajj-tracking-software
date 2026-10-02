# @hajj/sacred

Ayat, duas, hadith, Hajj and Umrah steps and sunnah practices used across the
website, the apps and printed receipts.

## Where the Arabic comes from

Arabic is never typed by hand in this package; a test fails if `src/content.ts`
or `src/index.ts` contains any Arabic letter.

- **Quran**: verbatim from the Tanzil Uthmani text (with pause marks), licensed
  CC BY 3.0. The text must not be changed, and every place that shows it links
  to [tanzil.net](https://tanzil.net). The Tanzil copyright block is kept in
  `src/generated/quran.ts`.
- **Hadith**: each phrase is cut from two independent copies of the
  collections ([fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)
  and [AhmedBaset/hadith-json](https://github.com/AhmedBaset/hadith-json), both
  from sunnah.com). The generator stops if the two differ by a single mark.
  Known printing errors in the sources are corrected in `scripts/generate.ts`,
  each with a note that the scholar sees during review.

Regenerate with `pnpm --filter @hajj/sacred generate` (needs network).

## Meanings and review

Bangla and English meanings, pronunciation and guidance in `src/content.ts` are
drafts. Each agency's scholar (role `alim`, or an admin) approves or rewrites
them in the app under "আয়াত ও দোয়া". Until approved, a meaning is shown only
inside the admin app, marked as a draft; the website, the pilgrim app and
receipts show the Arabic with its citation and hold the meaning back.

Published Bangla translations of the Quran are not bundled: those available
online are licensed for non-commercial use only.
