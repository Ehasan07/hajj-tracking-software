/**
 * The public guide book: chapters for the Quran, prayer, daily duas, Umrah,
 * Hajj and the visit to Madinah. Rulings follow the Hanafi school, the one
 * followed in Bangladesh, and say so where scholars differ.
 *
 * No Arabic script here (a test enforces it): blocks point at items by id,
 * and the Arabic comes from the generated sources. All wording is a draft
 * until a scholar approves it.
 */
import type { Text } from "./content";

export interface ListBlock {
  kind: "list";
  id: string;
  title: Text;
  intro?: Text;
  /** Numbered when the order or the count matters (the 13 fard, the 14 wajib…). */
  ordered: boolean;
  points: Text[];
  note?: Text;
}

export interface ItemsBlock {
  kind: "items";
  id: string;
  title: Text;
  intro?: Text;
  items: string[];
}

export interface SequenceBlock {
  kind: "sequence";
  id: string;
  title: Text;
  intro?: Text;
  steps: { title: Text; body: Text; items: string[] }[];
  note?: Text;
}

export type PrayerPart = "sunnah_muakkadah" | "sunnah" | "fard" | "wajib" | "nafl";

export interface RakatBlock {
  kind: "rakat";
  id: string;
  title: Text;
  intro?: Text;
  rows: { prayer: Text; time: Text; parts: { part: PrayerPart; count: number }[] }[];
  note?: Text;
}

/** The Umrah or Hajj steps from the catalogue, each with what is said there. */
export interface JourneyBlock {
  kind: "journey";
  id: string;
  title: Text;
  phase: "umrah" | "hajj";
}

export type BookBlock = ListBlock | ItemsBlock | SequenceBlock | RakatBlock | JourneyBlock;

export interface BookChapter {
  id: string;
  title: Text;
  summary: Text;
  blocks: BookBlock[];
}

export const PRAYER_PART_NAMES: Record<PrayerPart, Text> = {
  sunnah_muakkadah: { bn: "সুন্নতে মুআক্কাদা", en: "Emphasised sunnah" },
  sunnah: { bn: "সুন্নত (গায়রে মুআক্কাদা)", en: "Sunnah (optional)" },
  fard: { bn: "ফরজ", en: "Fard" },
  wajib: { bn: "ওয়াজিব", en: "Wajib" },
  nafl: { bn: "নফল", en: "Nafl" },
};

const t = (bn: string, en: string): Text => ({ bn, en });

export const BOOK: BookChapter[] = [
  /* ------------------------------------------------------------- Quran */
  {
    id: "quran",
    title: t("কুরআনের সূরা ও আয়াত", "Surahs and ayat"),
    summary: t(
      "নামাজে পড়া ছোট সূরাগুলো, আয়াতুল কুরসি আর সূরা বাকারার শেষ দুই আয়াত।",
      "The short surahs recited in prayer, Ayat al-Kursi and the last two ayat of Al-Baqarah.",
    ),
    blocks: [
      {
        kind: "items",
        id: "surahs",
        title: t("নামাজের সূরা", "Surahs for prayer"),
        intro: t(
          "প্রতি রাকাতে সূরা ফাতিহার পর এর যেকোনো একটি (বা কমপক্ষে ছোট তিন আয়াত) পড়া যায়। মুখস্থ করার সুবিধার জন্য কুরআনের ক্রমে সাজানো।",
          "After Al-Fatihah in each rak'ah, any one of these (or at least three short ayat) may be recited. They are in the Quran's order, to make memorising easier.",
        ),
        items: [
          "surah_fatihah", "surah_takathur", "surah_asr", "surah_humazah", "surah_fil", "surah_quraysh", "surah_maun",
          "surah_kawthar", "surah_kafirun", "surah_nasr", "surah_masad", "surah_ikhlas", "surah_falaq", "surah_nas",
        ],
      },
      { kind: "items", id: "ayat", title: t("বিশেষ আয়াত", "Special ayat"), items: ["ayatul_kursi", "baqarah_end"] },
    ],
  },

  /* ------------------------------------------------------------ prayer */
  {
    id: "salah",
    title: t("নামাজ", "Prayer"),
    summary: t(
      "পাঁচ ওয়াক্তের রাকাত, ফরজ-ওয়াজিব-সুন্নত, তাকবির থেকে সালাম পর্যন্ত প্রতিটি দোয়া, বিতর, ওজু আর আজান।",
      "The rak'ahs of the five prayers, what is fard, wajib and sunnah, every word from the takbir to the salam, Witr, wudu and the call to prayer.",
    ),
    blocks: [
      {
        kind: "rakat",
        id: "rakat",
        title: t("পাঁচ ওয়াক্ত নামাজের রাকাত", "Rak'ahs of the five daily prayers"),
        intro: t("বাম থেকে ডানে যে ক্রমে পড়া হয়।", "In the order they are prayed, left to right."),
        rows: [
          { prayer: t("ফজর", "Fajr"), time: t("সুবহে সাদিক থেকে সূর্যোদয়ের আগ পর্যন্ত", "From true dawn until sunrise"), parts: [{ part: "sunnah_muakkadah", count: 2 }, { part: "fard", count: 2 }] },
          {
            prayer: t("যোহর", "Dhuhr"),
            time: t("দুপুরে সূর্য পশ্চিমে হেলে পড়ার পর", "After the sun passes its height at midday"),
            parts: [{ part: "sunnah_muakkadah", count: 4 }, { part: "fard", count: 4 }, { part: "sunnah_muakkadah", count: 2 }],
          },
          { prayer: t("আসর", "Asr"), time: t("বিকেলে", "Afternoon"), parts: [{ part: "sunnah", count: 4 }, { part: "fard", count: 4 }] },
          { prayer: t("মাগরিব", "Maghrib"), time: t("সূর্যাস্তের পরপর", "Just after sunset"), parts: [{ part: "fard", count: 3 }, { part: "sunnah_muakkadah", count: 2 }] },
          {
            prayer: t("এশা", "Isha"),
            time: t("রাতে, পশ্চিম আকাশের লালিমা মিলিয়ে যাওয়ার পর", "At night, after the twilight has gone"),
            parts: [{ part: "sunnah", count: 4 }, { part: "fard", count: 4 }, { part: "sunnah_muakkadah", count: 2 }, { part: "wajib", count: 3 }],
          },
          {
            prayer: t("জুমা (শুক্রবার যোহরের বদলে)", "Jumu'ah (in place of Dhuhr on Friday)"),
            time: t("যোহরের সময়ে, খুতবার পর জামাতে", "At Dhuhr time, in congregation after the sermon"),
            parts: [{ part: "sunnah_muakkadah", count: 4 }, { part: "fard", count: 2 }, { part: "sunnah_muakkadah", count: 4 }],
          },
        ],
        note: t(
          "এশার পরের তিন রাকাত হলো বিতর, হানাফি মাযহাবে যা ওয়াজিব। ঠিক সময়ের জন্য নিজের এলাকার নামাজের সময়সূচি দেখুন।",
          "The three rak'ahs after Isha are Witr, which the Hanafi school holds to be wajib. For exact times, use your area's prayer timetable.",
        ),
      },
      {
        kind: "list",
        id: "salah_conditions",
        title: t("নামাজের বাইরের ফরজ (শর্ত): ৭টি", "Conditions before prayer: 7"),
        ordered: true,
        points: [
          t("শরীর পাক হওয়া (প্রয়োজনে ওজু বা গোসল)", "The body is pure (wudu, or a bath when needed)"),
          t("কাপড় পাক হওয়া", "The clothes are clean"),
          t("নামাজের জায়গা পাক হওয়া", "The place of prayer is clean"),
          t("সতর ঢাকা (পুরুষের নাভি থেকে হাঁটু পর্যন্ত; নারীর মুখমণ্ডল, দুই হাতের কবজি ও পায়ের পাতা ছাড়া পুরো শরীর)", "The body is covered as required (for men, navel to knee; for women, all but the face, hands and feet)"),
          t("কিবলামুখী হওয়া", "Facing the qiblah"),
          t("নামাজের ওয়াক্ত হওয়া", "The time of the prayer has come"),
          t("নিয়ত করা (মনে মনে, কোন নামাজ পড়ছেন)", "The intention, in the heart, of which prayer it is"),
        ],
      },
      {
        kind: "list",
        id: "salah_fard",
        title: t("নামাজের ভেতরের ফরজ (রুকন): ৬টি", "Pillars within prayer: 6"),
        ordered: true,
        points: [
          t("তাকবিরে তাহরিমা ('আল্লাহু আকবার' বলে নামাজ শুরু)", "The opening takbir ('Allahu akbar')"),
          t("দাঁড়িয়ে নামাজ পড়া (কিয়াম), সামর্থ্য থাকলে", "Standing, when able"),
          t("কিরাত (কুরআন থেকে পড়া)", "Recitation from the Quran"),
          t("রুকু", "Bowing"),
          t("প্রতি রাকাতে দুই সিজদা", "Two prostrations in every rak'ah"),
          t("শেষ বৈঠক (আত্তাহিয়্যাতু পড়ার পরিমাণ সময় বসা)", "The final sitting, for as long as it takes to recite the tashahhud"),
        ],
        note: t(
          "এই ১৩টি ফরজের কোনো একটি ছুটে গেলে নামাজ হয় না, আবার পড়তে হয়।",
          "If any of these thirteen is missed, the prayer is not valid and must be prayed again.",
        ),
      },
      {
        kind: "list",
        id: "salah_wajib",
        title: t("নামাজের ওয়াজিব: ১৪টি", "Wajib acts of prayer: 14"),
        ordered: true,
        points: [
          t("প্রতি রাকাতে সূরা ফাতিহা পুরো পড়া (ফরজের শুধু প্রথম দুই রাকাতে)", "Reciting all of Al-Fatihah (in the first two rak'ahs of a fard prayer, and in every rak'ah of others)"),
          t("ফাতিহার সাথে অন্য সূরা বা কমপক্ষে ছোট তিন আয়াত মেলানো", "Adding a surah, or at least three short ayat, after Al-Fatihah"),
          t("ফরজ নামাজের প্রথম দুই রাকাতকে কিরাতের জন্য নির্দিষ্ট করা", "Doing that added recitation in the first two rak'ahs of a fard prayer"),
          t("সূরা ফাতিহা অন্য সূরার আগে পড়া", "Reciting Al-Fatihah before the other surah"),
          t("রুকু, সিজদা ও অন্যান্য রুকন ধীরস্থিরভাবে আদায় করা (তা'দিলে আরকান)", "Doing the bowing, prostration and other pillars calmly, with stillness"),
          t("রুকু থেকে সোজা হয়ে দাঁড়ানো (কওমা)", "Standing upright after bowing"),
          t("দুই সিজদার মাঝে সোজা হয়ে বসা (জলসা)", "Sitting upright between the two prostrations"),
          t("তিন বা চার রাকাতের নামাজে প্রথম বৈঠক", "The first sitting in a prayer of three or four rak'ahs"),
          t("প্রত্যেক বৈঠকে আত্তাহিয়্যাতু পড়া", "Reciting the tashahhud in every sitting"),
          t("ইমামের জন্য ফজর, মাগরিব ও এশার প্রথম দুই রাকাতে জোরে আর যোহর-আসরে আস্তে কিরাত পড়া", "For the imam: reciting aloud in Fajr and the first two rak'ahs of Maghrib and Isha, and quietly in Dhuhr and Asr"),
          t("বিতরের নামাজে দোয়া কুনুত পড়া", "Reciting the qunut in Witr"),
          t("দুই ঈদের নামাজে অতিরিক্ত ছয় তাকবির বলা", "The six extra takbirs of the two Eid prayers"),
          t("নামাজের কাজগুলো ঠিক ক্রমে করা (যেমন সিজদার আগে রুকু)", "Keeping the acts in their order (bowing before prostrating, and so on)"),
          t("'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ' বলে নামাজ শেষ করা", "Ending the prayer with 'Assalamu alaikum wa rahmatullah'"),
        ],
        note: t(
          "কোনো ওয়াজিব ভুলে ছুটে গেলে শেষ বৈঠকে সিজদায়ে সাহু দিতে হয়; ইচ্ছা করে ছাড়লে নামাজ আবার পড়তে হয়। বিভিন্ন বইয়ে ওয়াজিবগুলো একটু ভিন্নভাবে গোনা হয়।",
          "If a wajib is missed by mistake, two prostrations of forgetfulness (sajdah sahw) are made in the final sitting; if left on purpose, the prayer is repeated. Books count the wajib acts a little differently.",
        ),
      },
      {
        kind: "list",
        id: "salah_sunnah",
        title: t("নামাজের সুন্নত", "Sunnah acts of prayer"),
        ordered: false,
        points: [
          t("তাকবিরে তাহরিমার সময় দুই হাত ওঠানো: পুরুষ কান পর্যন্ত, নারী কাঁধ পর্যন্ত", "Raising the hands at the opening takbir: men to the ears, women to the shoulders"),
          t("হাত বাঁধা: পুরুষ নাভির নিচে, নারী বুকের ওপর", "Folding the hands: men below the navel, women on the chest"),
          t("সানা পড়া", "Reciting the opening supplication (thana)"),
          t("আউযুবিল্লাহ পড়া", "Seeking refuge (ta'awwudh)"),
          t("প্রতি রাকাতে সূরা ফাতিহার আগে আস্তে বিসমিল্লাহ পড়া", "Saying Bismillah quietly before Al-Fatihah in every rak'ah"),
          t("ফাতিহা শেষে আস্তে 'আমিন' বলা", "Saying 'Amin' quietly after Al-Fatihah"),
          t("প্রতিটি ওঠা-নামায় 'আল্লাহু আকবার' বলা", "Saying 'Allahu akbar' at every movement"),
          t("রুকুতে কমপক্ষে তিনবার 'সুবহানা রাব্বিয়াল আযিম' বলা", "'Subhana rabbiyal azim' at least three times in bowing"),
          t("রুকু থেকে ওঠার সময় 'সামিআল্লাহু লিমান হামিদাহ' আর দাঁড়িয়ে 'রাব্বানা লাকাল হামদ' বলা", "'Sami Allahu liman hamidah' while rising, and 'Rabbana lakal hamd' once standing"),
          t("সিজদায় কমপক্ষে তিনবার 'সুবহানা রাব্বিয়াল আ'লা' বলা", "'Subhana rabbiyal a'la' at least three times in prostration"),
          t("শেষ বৈঠকে দুরুদ শরিফ পড়া", "The salawat in the final sitting"),
          t("দুরুদের পর দোয়া মাসুরা পড়া", "A supplication after the salawat"),
          t("সালামের সময় ডানে ও বামে মুখ ফেরানো", "Turning the face right and left with the salam"),
        ],
        note: t("সুন্নত ছুটে গেলে নামাজ হয়ে যায়, তবে সওয়াব কম হয়।", "Missing a sunnah does not invalidate the prayer, but its reward is less."),
      },
      {
        kind: "sequence",
        id: "how_to_pray",
        title: t("ধাপে ধাপে দুই রাকাত নামাজ", "Two rak'ahs, step by step"),
        intro: t("প্রতিটি ধাপে যা পড়তে হয়, তার আরবি, উচ্চারণ ও অর্থ সাথে দেওয়া আছে।", "Each step shows what is said, with the Arabic, pronunciation and meaning."),
        steps: [
          {
            title: t("নিয়ত ও তাকবিরে তাহরিমা", "Intention and the opening takbir"),
            body: t(
              "কিবলামুখী হয়ে দাঁড়িয়ে মনে মনে কোন নামাজ পড়ছেন তার নিয়ত করবেন; মুখে বলা জরুরি নয়। দুই হাত তুলে 'আল্লাহু আকবার' বলে হাত বাঁধবেন।",
              "Stand facing the qiblah and intend in your heart which prayer you are praying; it need not be said aloud. Raise the hands, say 'Allahu akbar' and fold them.",
            ),
            items: ["dua_takbir"],
          },
          { title: t("সানা", "Opening supplication"), body: t("প্রথম রাকাতের শুরুতে আস্তে পড়বেন।", "Said quietly at the start of the first rak'ah."), items: ["dua_sana"] },
          { title: t("আউযুবিল্লাহ ও বিসমিল্লাহ", "Ta'awwudh and Bismillah"), body: t("দুটিই আস্তে।", "Both quietly."), items: ["dua_taawwuz", "basmalah"] },
          { title: t("সূরা ফাতিহা", "Al-Fatihah"), body: t("পুরো সূরা ফাতিহা পড়ে আস্তে 'আমিন' বলবেন।", "Recite all of Al-Fatihah, then say 'Amin' quietly."), items: ["surah_fatihah"] },
          {
            title: t("অন্য সূরা মেলানো", "Another surah"),
            body: t("এরপর অন্য একটি সূরা বা কমপক্ষে ছোট তিন আয়াত পড়বেন, যেমন প্রথম অধ্যায়ের যেকোনো ছোট সূরা।", "Then recite another surah, or at least three short ayat, such as any short surah in the first chapter."),
            items: [],
          },
          {
            title: t("রুকু", "Bowing"),
            body: t("'আল্লাহু আকবার' বলে রুকুতে যাবেন: পিঠ সোজা, দুই হাতে হাঁটু ধরে।", "Say 'Allahu akbar' and bow, back straight, hands holding the knees."),
            items: ["dua_ruku"],
          },
          { title: t("রুকু থেকে ওঠা", "Rising from bowing"), body: t("সোজা হয়ে একটু স্থির দাঁড়াবেন।", "Stand fully upright and pause."), items: ["dua_tasmi", "dua_tahmid"] },
          {
            title: t("সিজদা", "Prostration"),
            body: t("'আল্লাহু আকবার' বলে সিজদায় যাবেন: কপাল, নাক, দুই হাত, দুই হাঁটু ও দুই পায়ের আঙুল মাটিতে।", "Say 'Allahu akbar' and prostrate: forehead, nose, both hands, both knees and the toes on the ground."),
            items: ["dua_sujud"],
          },
          { title: t("দুই সিজদার মাঝে বসা", "Sitting between the prostrations"), body: t("'আল্লাহু আকবার' বলে সোজা হয়ে বসবেন।", "Say 'Allahu akbar' and sit upright."), items: ["dua_jalsa"] },
          { title: t("দ্বিতীয় সিজদা", "Second prostration"), body: t("আগের মতোই।", "As before."), items: ["dua_sujud"] },
          {
            title: t("দ্বিতীয় রাকাত", "The second rak'ah"),
            body: t(
              "'আল্লাহু আকবার' বলে দাঁড়িয়ে বিসমিল্লাহ, সূরা ফাতিহা ও অন্য সূরা পড়বেন; সানা আর পড়বেন না। তারপর আগের মতো রুকু ও দুই সিজদা করবেন।",
              "Stand with 'Allahu akbar' and recite Bismillah, Al-Fatihah and another surah, without the opening supplication. Then bow and prostrate twice as before.",
            ),
            items: [],
          },
          {
            title: t("বৈঠক", "The sitting"),
            body: t(
              "দুই সিজদার পর বসে আত্তাহিয়্যাতু, দুরুদ শরিফ ও দোয়া মাসুরা পড়বেন। তিন বা চার রাকাতের নামাজে দ্বিতীয় রাকাতের এই প্রথম বৈঠকে শুধু আত্তাহিয়্যাতু পড়ে দাঁড়িয়ে যাবেন।",
              "After the two prostrations, sit and recite the tashahhud, the salawat and the supplication. In a prayer of three or four rak'ahs, this first sitting after the second rak'ah has only the tashahhud, then you stand up.",
            ),
            items: ["dua_tashahhud", "dua_durud", "dua_masura"],
          },
          { title: t("সালাম", "Salam"), body: t("প্রথমে ডানে, তারপর বামে মুখ ফিরিয়ে।", "Turn first to the right, then to the left."), items: ["dua_salam"] },
        ],
        note: t(
          "তিন ও চার রাকাতের ফরজ নামাজে তৃতীয় ও চতুর্থ রাকাতে শুধু সূরা ফাতিহা পড়তে হয়; সুন্নত, নফল ও বিতরের প্রতি রাকাতে ফাতিহার সাথে অন্য সূরাও মেলাতে হয়।",
          "In the third and fourth rak'ahs of a fard prayer only Al-Fatihah is recited; in sunnah, nafl and Witr prayers, another surah is added after Al-Fatihah in every rak'ah.",
        ),
      },
      {
        kind: "items",
        id: "witr",
        title: t("বিতর নামাজ", "The Witr prayer"),
        intro: t(
          "এশার পর তিন রাকাত, এক সালামে। দ্বিতীয় রাকাতে বৈঠক করে আত্তাহিয়্যাতু পড়ে দাঁড়াবেন। তৃতীয় রাকাতে ফাতিহা ও অন্য সূরার পর 'আল্লাহু আকবার' বলে কান পর্যন্ত হাত তুলে আবার বাঁধবেন এবং দোয়া কুনুত পড়ে রুকুতে যাবেন।",
          "Three rak'ahs after Isha with one salam. Sit after the second for the tashahhud and stand. In the third, after Al-Fatihah and another surah, say 'Allahu akbar' raising the hands to the ears, fold them again, recite the qunut and then bow.",
        ),
        items: ["dua_qunut"],
      },
      { kind: "items", id: "after_prayer", title: t("নামাজের পর", "After the prayer"), items: ["dua_after_salah", "hadith_tasbih", "ayatul_kursi"] },
      {
        kind: "list",
        id: "wudu",
        title: t("ওজু: ফরজ ৪টি, আর সুন্নত", "Wudu: 4 obligatory acts, and the sunnah"),
        ordered: true,
        points: [
          t("ফরজ: পুরো মুখমণ্ডল একবার ধোয়া (কপালের চুলের গোড়া থেকে থুতনির নিচ পর্যন্ত, এক কান থেকে অন্য কান পর্যন্ত)", "Obligatory: washing the whole face once (hairline to chin, ear to ear)"),
          t("ফরজ: দুই হাত কনুইসহ একবার ধোয়া", "Obligatory: washing both arms including the elbows"),
          t("ফরজ: মাথার চার ভাগের এক ভাগ মাসাহ করা", "Obligatory: wiping a quarter of the head"),
          t("ফরজ: দুই পা টাখনুসহ একবার ধোয়া", "Obligatory: washing both feet including the ankles"),
        ],
        note: t(
          "সুন্নত: নিয়ত করা, বিসমিল্লাহ বলা, প্রথমে দুই হাত কবজি পর্যন্ত ধোয়া, মিসওয়াক করা, তিনবার কুলি করা, তিনবার নাকে পানি দেওয়া, দাড়ি ও আঙুল খিলাল করা, প্রতিটি অঙ্গ তিনবার ধোয়া, পুরো মাথা ও দুই কান মাসাহ করা, ক্রম ঠিক রাখা এবং বিরতি না দিয়ে পরপর ধোয়া।",
          "Sunnah: intention, Bismillah, washing the hands to the wrists first, the tooth-stick, rinsing the mouth and nose three times each, running the fingers through the beard and between the fingers, washing each part three times, wiping the whole head and the ears, keeping the order, and washing without pause.",
        ),
      },
      { kind: "items", id: "wudu_duas", title: t("ওজু ও আজানের দোয়া", "Duas of wudu and the call to prayer"), items: ["dua_wudu_after", "dua_wudu_after_extra", "dua_adhan"] },
      {
        kind: "list",
        id: "travel_prayer",
        title: t("সফরে নামাজ (কসর)", "Prayer while travelling (qasr)"),
        ordered: false,
        points: [
          t(
            "প্রায় ৭৮ কিলোমিটার (৪৮ মাইল) বা তার বেশি দূরের সফরে বের হলে এবং কোথাও ১৫ দিনের কম থাকার নিয়ত থাকলে চার রাকাতের ফরজ (যোহর, আসর, এশা) দুই রাকাত পড়বেন।",
            "On a journey of about 78 km (48 miles) or more, intending to stay less than 15 days in a place, the four-rak'ah fard prayers (Dhuhr, Asr, Isha) are prayed as two.",
          ),
          t("ফজর, মাগরিব ও বিতর পুরোই পড়বেন।", "Fajr, Maghrib and Witr are prayed in full."),
          t("কোনো এক জায়গায় ১৫ দিন বা বেশি থাকার নিয়ত করলে পুরো নামাজ পড়বেন।", "Intending to stay 15 days or more in one place, pray in full."),
          t("মুকিম (স্থানীয়) ইমামের পেছনে জামাতে পড়লে ইমামের সাথে পুরো নামাজই পড়বেন।", "Praying behind a resident imam, pray the full prayer with him."),
        ],
        note: t(
          "মক্কা, মিনা ও আরাফার দিনগুলোতে কসর নিয়ে আলেমদের আলোচনা আছে; নিজের থাকার মেয়াদ জানিয়ে কাফেলার আলেমের কাছ থেকে জেনে নিন।",
          "Scholars discuss shortening during the days in Makkah, Mina and Arafah; tell your group's scholar how long you are staying and ask.",
        ),
      },
    ],
  },

  /* ------------------------------------------------------------- daily */
  {
    id: "daily",
    title: t("দৈনন্দিন দোয়া", "Everyday duas"),
    summary: t("খাওয়া, ঘুম, ঘর থেকে বের হওয়া, সফর আর মসজিদে যাওয়ার দোয়া।", "Duas for eating, sleeping, leaving home, travelling and the mosque."),
    blocks: [
      { kind: "items", id: "food", title: t("খাওয়া", "Eating"), items: ["dua_eat_start", "dua_eat_forgot", "dua_eat_end"] },
      { kind: "items", id: "sleep", title: t("ঘুম", "Sleep"), items: ["dua_sleep", "hadith_ayatul_kursi", "baqarah_end", "dua_wake"] },
      { kind: "items", id: "out", title: t("ঘর, সফর ও মসজিদ", "Home, travel and the mosque"), items: ["dua_home_leave", "dua_travel", "dua_travel_return", "dua_masjid_enter", "dua_masjid_exit"] },
      { kind: "items", id: "toilet", title: t("টয়লেট", "The toilet"), items: ["dua_toilet_enter", "dua_toilet_exit"] },
    ],
  },

  /* ------------------------------------------------------------- Umrah */
  {
    id: "umrah",
    title: t("ওমরা", "Umrah"),
    summary: t("ফরজ ও ওয়াজিব, ইহরামের নিষেধ, আর প্রতিটি ধাপে কখন কী পড়তে হয়।", "What is obligatory, what ihram forbids, and what is said at each step."),
    blocks: [
      {
        kind: "list",
        id: "umrah_fard",
        title: t("ওমরার ফরজ: ২টি", "Obligatory parts of Umrah: 2"),
        ordered: true,
        points: [t("ইহরাম বাঁধা (ওমরার নিয়ত করে তালবিয়া পড়া)", "Entering ihram (intending Umrah and saying the talbiyah)"), t("কাবা শরিফের তাওয়াফ (সাত চক্কর)", "Tawaf of the Kaabah, seven rounds")],
      },
      {
        kind: "list",
        id: "umrah_wajib",
        title: t("ওমরার ওয়াজিব: ২টি", "Wajib parts of Umrah: 2"),
        ordered: true,
        points: [t("সাফা ও মারওয়ার মাঝে সাঈ (সাতবার)", "Sa'i between Safa and Marwah, seven times"), t("মাথা মুণ্ডন বা চুল ছোট করা", "Shaving or shortening the hair")],
        note: t("ওয়াজিব ছুটে গেলে দম (একটি পশু কোরবানি) দিতে হয়।", "Missing a wajib requires a dam, the sacrifice of an animal."),
      },
      { kind: "journey", id: "umrah_steps", title: t("ধাপে ধাপে ওমরা", "Umrah, step by step"), phase: "umrah" },
      {
        kind: "list",
        id: "ihram_rules",
        title: t("ইহরাম অবস্থায় যা নিষেধ", "What ihram forbids"),
        ordered: false,
        points: [
          t("পুরুষের জন্য শরীরের মাপে সেলাই করা পোশাক (জামা, পায়জামা, গেঞ্জি, মোজা) পরা", "For men: clothes cut and sewn to the body's shape (shirts, trousers, vests, socks)"),
          t("পুরুষের মাথা ও মুখ ঢাকা; নারীর মুখে লেগে থাকে এমন কাপড়ে মুখ ঢাকা", "For men, covering the head or face; for women, covering the face with cloth that touches it"),
          t("পুরুষের এমন জুতা পরা, যা পায়ের পাতার ওপরের মাঝখানের উঁচু হাড় ঢেকে দেয়", "For men, footwear that covers the raised bone on top of the foot"),
          t("শরীর, কাপড় বা খাবারে সুগন্ধি ব্যবহার করা", "Using perfume on the body, clothes or food"),
          t("চুল, দাড়ি বা শরীরের লোম কাটা বা ওপড়ানো, আর নখ কাটা", "Cutting or plucking hair from the head, beard or body, and cutting the nails"),
          t("স্থলের প্রাণী শিকার করা বা শিকারে সাহায্য করা", "Hunting land animals, or helping someone hunt"),
          t("স্বামী-স্ত্রীর মিলন ও এর দিকে নিয়ে যায় এমন কাজ বা কথা", "Marital relations, and anything that leads to them"),
          t("ঝগড়া, অশ্লীল কথা ও গুনাহের কাজ", "Quarrelling, obscene talk and sin"),
        ],
        note: t(
          "ভুলে বা বাধ্য হয়ে কোনো নিষেধ ভাঙলে কী দিতে হবে (দম বা সদকা), তা কাফেলার আলেমের কাছ থেকে জেনে নিন।",
          "If a rule of ihram is broken by mistake or out of need, ask your group's scholar what is owed (a dam or charity).",
        ),
      },
    ],
  },

  /* -------------------------------------------------------------- Hajj */
  {
    id: "hajj",
    title: t("হজ", "Hajj"),
    summary: t("হজের প্রকার, ফরজ-ওয়াজিব-সুন্নত, আর ৮ থেকে ১৩ জিলহজ দিনে দিনে কী করতে ও পড়তে হয়।", "The kinds of Hajj, what is fard, wajib and sunnah, and what to do and say from the 8th to the 13th of Dhul Hijjah."),
    blocks: [
      {
        kind: "list",
        id: "hajj_kinds",
        title: t("হজের তিন প্রকার", "The three kinds of Hajj"),
        ordered: false,
        points: [
          t("ইফরাদ: শুধু হজের ইহরাম; এতে কোরবানি ওয়াজিব নয়।", "Ifrad: ihram for Hajj alone; no sacrifice is required."),
          t("কিরান: একই ইহরামে ওমরা ও হজ; হজ শেষ না হওয়া পর্যন্ত ইহরাম থাকে; কোরবানি ওয়াজিব।", "Qiran: Umrah and Hajj in one ihram, kept until the Hajj is done; a sacrifice is required."),
          t(
            "তামাত্তু: হজের মাসে আগে ওমরা করে ইহরাম খুলে ফেলা, তারপর ৮ জিলহজ নতুন করে হজের ইহরাম; কোরবানি ওয়াজিব। বাংলাদেশ থেকে যাওয়া বেশিরভাগ হাজি তামাত্তু করেন।",
            "Tamattu: Umrah first in the Hajj months, leaving ihram, then a new ihram for Hajj on the 8th; a sacrifice is required. Most pilgrims from Bangladesh perform tamattu.",
          ),
        ],
      },
      {
        kind: "list",
        id: "hajj_fard",
        title: t("হজের ফরজ: ৩টি", "Obligatory parts of Hajj: 3"),
        ordered: true,
        points: [
          t("ইহরাম বাঁধা (হজের নিয়ত করে তালবিয়া পড়া)", "Entering ihram (intending Hajj and saying the talbiyah)"),
          t("৯ জিলহজ সূর্য হেলে পড়ার পর থেকে ১০ জিলহজের সুবহে সাদিকের আগে কিছু সময় আরাফায় অবস্থান", "Standing at Arafah for some time between midday on the 9th and true dawn on the 10th"),
          t("তাওয়াফে জিয়ারত (১০ থেকে ১২ জিলহজের মধ্যে)", "Tawaf al-Ziyarah (between the 10th and the 12th)"),
        ],
        note: t("ফরজের কোনোটি ছুটে গেলে হজ হয় না।", "If any of these is missed, the Hajj is not valid."),
      },
      {
        kind: "list",
        id: "hajj_wajib",
        title: t("হজের ওয়াজিব: ৬টি", "Wajib parts of Hajj: 6"),
        ordered: true,
        points: [
          t("মুজদালিফায় অবস্থান (১০ জিলহজ সুবহে সাদিক থেকে সূর্যোদয়ের আগ পর্যন্ত কিছু সময়)", "Staying at Muzdalifah (some time between true dawn and sunrise on the 10th)"),
          t("সাফা ও মারওয়ার মাঝে সাঈ", "Sa'i between Safa and Marwah"),
          t("জামারাতে কংকর মারা", "Stoning the Jamarat"),
          t("কিরান ও তামাত্তু হাজিদের জন্য কোরবানি (দমে শোকর)", "The sacrifice, for those performing qiran or tamattu"),
          t("মাথা মুণ্ডন বা চুল ছোট করা", "Shaving or shortening the hair"),
          t("মিকাতের বাইরে থেকে আসা হাজিদের জন্য বিদায়ী তাওয়াফ", "The farewell tawaf, for pilgrims from outside the miqat"),
        ],
        note: t(
          "ওয়াজিব ছুটে গেলে দম (একটি পশু কোরবানি) দিতে হয়। কোনো কোনো বইয়ে আরো কয়েকটি ওয়াজিব আলাদা করে গোনা হয়, যেমন মিকাত থেকে ইহরাম বাঁধা, সূর্যাস্ত পর্যন্ত আরাফায় থাকা, আর ১০ জিলহজের কাজগুলোর ক্রম রক্ষা করা।",
          "Missing a wajib requires a dam, the sacrifice of an animal. Some books list a few more separately, such as entering ihram at the miqat, staying at Arafah until sunset, and keeping the order of the rites on the 10th.",
        ),
      },
      {
        kind: "list",
        id: "hajj_sunnah",
        title: t("হজের প্রধান সুন্নত", "Main sunnah acts of Hajj"),
        ordered: false,
        points: [
          t("ইফরাদ ও কিরান হাজিদের জন্য মক্কায় পৌঁছে তাওয়াফে কুদুম", "Tawaf al-Qudum on arrival in Makkah, for those performing ifrad or qiran"),
          t("৮ জিলহজ যোহর থেকে ৯ জিলহজ ফজর পর্যন্ত মিনায় পাঁচ ওয়াক্ত নামাজ", "Praying the five prayers in Mina from Dhuhr on the 8th to Fajr on the 9th"),
          t("৯ জিলহজ সূর্যোদয়ের পর মিনা থেকে আরাফায় যাওয়া", "Leaving Mina for Arafah after sunrise on the 9th"),
          t("কংকর মারার দিনগুলোর রাত মিনায় কাটানো", "Spending the nights of the stoning days in Mina"),
          t("বেশি বেশি তালবিয়া পড়া, আর ১০ জিলহজ প্রথম কংকর মারার সময় তালবিয়া বন্ধ করা", "Saying the talbiyah often, and stopping it with the first pebble on the 10th"),
        ],
      },
      { kind: "journey", id: "hajj_steps", title: t("দিনে দিনে হজ", "Hajj, day by day"), phase: "hajj" },
    ],
  },

  /* ----------------------------------------------------------- Madinah */
  {
    id: "madinah",
    title: t("মদিনা জিয়ারত", "Visiting Madinah"),
    summary: t("মসজিদে নববী, রওজা মোবারকে সালাম, জান্নাতুল বাকি ও মসজিদে কুবা।", "The Prophet's Mosque, greeting him at his grave, al-Baqi and the Quba mosque."),
    blocks: [
      {
        kind: "list",
        id: "madinah_visit",
        title: t("মসজিদে নববীর জিয়ারত", "Visiting the Prophet's Mosque"),
        intro: t("এটি হজ বা ওমরার অংশ নয়, তবে বড় সওয়াবের সুন্নত আমল।", "It is not part of Hajj or Umrah, but a sunnah of great reward."),
        ordered: true,
        points: [
          t("মসজিদে নববীতে নামাজ পড়ার নিয়তে সফর করবেন।", "Travel with the intention of praying in the Prophet's Mosque."),
          t("দোয়া পড়ে ডান পা দিয়ে মসজিদে প্রবেশ করবেন।", "Enter with the right foot, saying the dua."),
          t("সম্ভব হলে রিয়াজুল জান্নাতে, না হলে যেকোনো জায়গায় দুই রাকাত নামাজ পড়বেন।", "Pray two rak'ahs, in the Rawdah if possible, otherwise anywhere."),
          t("রওজা মোবারকের সামনে আদবের সাথে নিচু স্বরে সালাম দেবেন, তারপর আবু বকর (রা.) ও উমর (রা.)-কে সালাম দেবেন।", "Stand before the Prophet's grave with respect and greet him in a low voice, then greet Abu Bakr and Umar."),
          t("কবরের দিকে ফিরে দোয়া করবেন না, কবর স্পর্শ বা তাওয়াফ করবেন না; দোয়া কিবলামুখী হয়ে করবেন।", "Do not face the grave to make dua, touch it or walk around it; make dua facing the qiblah."),
          t("মসজিদে কুবায় গিয়ে দুই রাকাত নামাজ পড়া সুন্নত।", "Going to the Quba mosque and praying two rak'ahs there is sunnah."),
          t("জান্নাতুল বাকিতে গিয়ে সেখানে শায়িতদের জন্য দোয়া করবেন।", "Visit al-Baqi and pray for those buried there."),
        ],
      },
      { kind: "items", id: "madinah_duas", title: t("মদিনায় যা পড়া হয়", "What is said in Madinah"), items: ["dua_masjid_enter", "dua_salam_prophet", "dua_durud", "dua_baqi"] },
    ],
  },
];
