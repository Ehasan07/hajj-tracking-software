/**
 * Catalogue of ayat, duas, hadith, Hajj and Umrah steps and sunnah practices.
 *
 * This file contains no Arabic script on purpose (a test enforces it). Arabic
 * comes only from src/generated/*, built from verified sources. Everything
 * here (meanings, pronunciation, guidance) is a DRAFT until a scholar of the
 * agency approves it in the app; unapproved text is never shown publicly.
 */

export interface Text {
  bn: string;
  en: string;
}

export type ItemKind = "ayah" | "surah" | "dua" | "hadith";

export type ArabicSource = { type: "quran"; refs: string[] } | { type: "hadith"; id: string };

export interface SacredItem {
  id: string;
  kind: ItemKind;
  title: Text;
  arabic: ArabicSource;
  /** One entry per ayah for Quran sources; one entry for hadith. */
  meaning: { bn: string[]; en: string[] };
  /**
   * Bangla pronunciation. For Quran items, one line per ayah separated by "\n",
   * in the same order as the refs.
   */
  pronunciation?: string;
  when?: Text;
  /** Extra context for the scholar or reader (grading, madhhab notes). */
  note?: Text;
  tags: string[];
}

export const SURAH_NAMES: Record<number, Text> = {
  1: { bn: "আল-ফাতিহা", en: "Al-Fatihah" },
  2: { bn: "আল-বাকারা", en: "Al-Baqarah" },
  3: { bn: "আলে ইমরান", en: "Al Imran" },
  14: { bn: "ইবরাহিম", en: "Ibrahim" },
  22: { bn: "আল-হজ", en: "Al-Hajj" },
  109: { bn: "আল-কাফিরুন", en: "Al-Kafirun" },
  112: { bn: "আল-ইখলাস", en: "Al-Ikhlas" },
};

export const HADITH_BOOK_NAMES: Record<string, Text> = {
  bukhari: { bn: "সহিহ বুখারি", en: "Sahih al-Bukhari" },
  muslim: { bn: "সহিহ মুসলিম", en: "Sahih Muslim" },
  abudawud: { bn: "সুনানে আবু দাউদ", en: "Sunan Abi Dawud" },
  tirmidhi: { bn: "জামে তিরমিযি", en: "Jami at-Tirmidhi" },
};

export const ITEMS: SacredItem[] = [
  // ---------------------------------------------------------------- surahs
  {
    id: "surah_fatihah",
    kind: "surah",
    title: { bn: "সূরা আল-ফাতিহা", en: "Surah Al-Fatihah" },
    arabic: { type: "quran", refs: ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"] },
    pronunciation: "বিসমিল্লাহির রহমানির রহীম।\nআলহামদু লিল্লাহি রব্বিল 'আলামীন।\nআর-রহমানির রহীম।\nমালিকি ইয়াওমিদ দীন।\nইয়্যাকা না'বুদু ওয়া ইয়্যাকা নাস্তা'ঈন।\nইহদিনাস সিরাতাল মুস্তাকীম।\nসিরাতাল্লাযীনা আন'আমতা 'আলাইহিম, গাইরিল মাগদূবি 'আলাইহিম ওয়ালাদ দোয়াল্লীন।",
    meaning: {
      bn: [
        "পরম করুণাময়, পরম দয়ালু আল্লাহর নামে।",
        "সমস্ত প্রশংসা আল্লাহর, যিনি সকল জগতের প্রতিপালক।",
        "যিনি পরম করুণাময়, পরম দয়ালু।",
        "যিনি বিচার দিনের মালিক।",
        "আমরা শুধু তোমারই ইবাদত করি, আর শুধু তোমারই কাছে সাহায্য চাই।",
        "আমাদের সরল পথ দেখাও,",
        "তাদের পথ, যাদের তুমি অনুগ্রহ করেছ; তাদের নয় যারা ক্রোধের পাত্র হয়েছে, আর তাদেরও নয় যারা পথ হারিয়েছে।",
      ],
      en: [
        "In the name of Allah, the Most Compassionate, the Most Merciful.",
        "All praise belongs to Allah, Lord of all the worlds,",
        "the Most Compassionate, the Most Merciful,",
        "Master of the Day of Judgement.",
        "You alone we worship, and You alone we ask for help.",
        "Guide us along the straight path,",
        "the path of those You have blessed, not of those who have earned anger, nor of those who have gone astray.",
      ],
    },
    tags: ["surah"],
  },
  {
    id: "surah_kafirun",
    kind: "surah",
    title: { bn: "সূরা আল-কাফিরুন", en: "Surah Al-Kafirun" },
    arabic: { type: "quran", refs: ["109:1", "109:2", "109:3", "109:4", "109:5", "109:6"] },
    pronunciation: "কুল ইয়া আইয়্যুহাল কাফিরূন।\nলা আ'বুদু মা তা'বুদূন।\nওয়ালা আনতুম 'আবিদূনা মা আ'বুদ।\nওয়ালা আনা 'আবিদুম মা 'আবাদতুম।\nওয়ালা আনতুম 'আবিদূনা মা আ'বুদ।\nলাকুম দীনুকুম ওয়ালিয়া দীন।",
    meaning: {
      bn: [
        "বলো: হে অবিশ্বাসীরা,",
        "আমি তার ইবাদত করি না, যার ইবাদত তোমরা করো,",
        "আর তোমরাও তাঁর ইবাদতকারী নও, যাঁর ইবাদত আমি করি।",
        "আর আমি তার ইবাদতকারী হবো না, যার ইবাদত তোমরা করে আসছ,",
        "আর তোমরাও তাঁর ইবাদতকারী হবে না, যাঁর ইবাদত আমি করি।",
        "তোমাদের দ্বীন তোমাদের জন্য, আর আমার দ্বীন আমার জন্য।",
      ],
      en: [
        "Say: O you who disbelieve,",
        "I do not worship what you worship,",
        "nor do you worship what I worship.",
        "I will never worship what you have worshipped,",
        "nor will you worship what I worship.",
        "To you your religion, and to me mine.",
      ],
    },
    when: {
      bn: "তাওয়াফের পর মাকামে ইবরাহিমের পেছনে দুই রাকাত নামাজে সূরা ইখলাসের সাথে পড়া হয়।",
      en: "Recited with Surah Al-Ikhlas in the two rak'ahs after tawaf, behind Maqam Ibrahim.",
    },
    tags: ["surah", "tawaf"],
  },
  {
    id: "surah_ikhlas",
    kind: "surah",
    title: { bn: "সূরা আল-ইখলাস", en: "Surah Al-Ikhlas" },
    arabic: { type: "quran", refs: ["112:1", "112:2", "112:3", "112:4"] },
    pronunciation: "কুল হুওয়াল্লাহু আহাদ।\nআল্লাহুস সামাদ।\nলাম ইয়ালিদ ওয়া লাম ইউলাদ।\nওয়া লাম ইয়াকুল্লাহূ কুফুওয়ান আহাদ।",
    meaning: {
      bn: [
        "বলো: তিনি আল্লাহ, এক ও অদ্বিতীয়।",
        "আল্লাহ কারও মুখাপেক্ষী নন, সবাই তাঁর মুখাপেক্ষী।",
        "তিনি কাউকে জন্ম দেননি, আর তাঁকেও কেউ জন্ম দেয়নি।",
        "আর তাঁর সমতুল্য কেউ নেই।",
      ],
      en: [
        "Say: He is Allah, the One.",
        "Allah, the Self-Sufficient, on whom all depend.",
        "He neither begets nor was He begotten,",
        "and there is none comparable to Him.",
      ],
    },
    when: {
      bn: "তাওয়াফের পর মাকামে ইবরাহিমের পেছনে দুই রাকাত নামাজে সূরা কাফিরুনের সাথে পড়া হয়।",
      en: "Recited with Surah Al-Kafirun in the two rak'ahs after tawaf, behind Maqam Ibrahim.",
    },
    tags: ["surah", "tawaf"],
  },

  // ----------------------------------------------------------------- ayat
  {
    id: "ayah_first_house",
    kind: "ayah",
    title: { bn: "প্রথম ঘর, বরকতময় মক্কা", en: "The first House, blessed Makkah" },
    arabic: { type: "quran", refs: ["3:96", "3:97"] },
    pronunciation: "ইন্না আওয়ালা বাইতিওঁ উদি'আ লিন্নাসি লাল্লাযী বিবাক্কাতা মুবারাকাওঁ ওয়া হুদাল লিল 'আলামীন।\nফীহি আয়াতুম বাইয়্যিনাতুম মাকামু ইবরাহীম, ওয়া মান দাখালাহূ কানা আমিনা, ওয়া লিল্লাহি 'আলান নাসি হিজ্জুল বাইতি মানিস্তাত্বা'আ ইলাইহি সাবীলা, ওয়া মান কাফারা ফাইন্নাল্লাহা গানিয়্যুন 'আনিল 'আলামীন।",
    meaning: {
      bn: [
        "নিশ্চয়ই মানুষের (ইবাদতের) জন্য প্রথম যে ঘর স্থাপন করা হয়েছিল, তা বাক্কায় (মক্কায়), বরকতময় এবং সকল জগতের জন্য পথনির্দেশ।",
        "তাতে রয়েছে সুস্পষ্ট নিদর্শন, মাকামে ইবরাহিম তার একটি। যে সেখানে প্রবেশ করে, সে নিরাপদ। আর মানুষের মধ্যে যার সেখানে যাওয়ার সামর্থ্য আছে, আল্লাহর উদ্দেশ্যে এই ঘরের হজ করা তার ওপর কর্তব্য। আর কেউ অস্বীকার করলে (জেনে রাখুক), আল্লাহ সকল জগতের মুখাপেক্ষী নন।",
      ],
      en: [
        "The first House set up for people is the one at Bakkah, blessed and a guidance for all the worlds.",
        "In it are clear signs, among them the station of Ibrahim; whoever enters it is safe. Pilgrimage to the House is a duty to Allah for everyone who is able to make the journey. Whoever denies this, Allah has no need of the worlds.",
      ],
    },
    tags: ["hajj", "featured"],
  },
  {
    id: "ayah_proclaim",
    kind: "ayah",
    title: { bn: "হজের ঘোষণা", en: "The call to Hajj" },
    arabic: { type: "quran", refs: ["22:26", "22:27", "22:28", "22:29"] },
    meaning: {
      bn: [
        "আর স্মরণ করো, যখন আমি ইবরাহিমকে এই ঘরের স্থান ঠিক করে দিয়েছিলাম (এবং বলেছিলাম): আমার সাথে কোনো কিছুকে শরিক করো না, আর আমার ঘরকে পবিত্র রাখো তাওয়াফকারী, (নামাজে) দাঁড়ানো এবং রুকু-সিজদাকারীদের জন্য।",
        "আর মানুষের মধ্যে হজের ঘোষণা দাও; তারা তোমার কাছে আসবে পায়ে হেঁটে এবং সব ধরনের ক্ষীণকায় উটে চড়ে, দূর-দূরান্তের পথ পাড়ি দিয়ে।",
        "যাতে তারা নিজেদের কল্যাণের জায়গাগুলোতে উপস্থিত হয়, আর নির্দিষ্ট দিনগুলোতে আল্লাহর নাম স্মরণ করে সেই চতুষ্পদ পশুর ওপর, যা তিনি তাদের রিজিক হিসেবে দিয়েছেন। তারপর তোমরা তা থেকে খাও এবং দুঃস্থ-অভাবীকে খাওয়াও।",
        "তারপর তারা যেন নিজেদের অপরিচ্ছন্নতা দূর করে, নিজেদের মানত পূর্ণ করে, আর প্রাচীন ঘরের (কাবার) তাওয়াফ করে।",
      ],
      en: [
        "And when We showed Ibrahim the site of the House: 'Associate nothing with Me, and keep My House pure for those who circle it, who stand in prayer, and who bow and prostrate.'",
        "And proclaim the Hajj among people; they will come to you on foot and on every lean camel, from every distant road,",
        "to witness benefits for themselves and to mention the name of Allah on known days over the livestock He has provided for them. So eat from it and feed the poor in need.",
        "Then let them end their untidiness, fulfil their vows, and circle the Ancient House.",
      ],
    },
    tags: ["hajj", "featured"],
  },
  {
    id: "ayah_hajj_months",
    kind: "ayah",
    title: { bn: "হজের মাস ও আদব", en: "The months and manners of Hajj" },
    arabic: { type: "quran", refs: ["2:197"] },
    meaning: {
      bn: [
        "হজের মাসগুলো সুপরিচিত। যে ব্যক্তি এ মাসগুলোতে নিজের ওপর হজ অবধারিত করে নেয়, তার জন্য হজের সময় স্ত্রী-সম্ভোগ, পাপাচার ও ঝগড়া-বিবাদ নেই। তোমরা যে ভালো কাজই করো, আল্লাহ তা জানেন। আর পাথেয় সঙ্গে নাও; নিশ্চয়ই সবচেয়ে উত্তম পাথেয় তাকওয়া। হে বুদ্ধিমানেরা, আমাকে ভয় করো।",
      ],
      en: [
        "Hajj is in the well-known months. Whoever undertakes Hajj in them, let there be no intimacy, no wrongdoing and no quarrelling during Hajj. Whatever good you do, Allah knows it. Take provision, and the best provision is God-consciousness. So be mindful of Me, you who have understanding.",
      ],
    },
    tags: ["hajj", "ihram"],
  },
  {
    id: "ayah_complete_hajj",
    kind: "ayah",
    title: { bn: "হজ ও ওমরা পূর্ণ করো", en: "Complete the Hajj and Umrah" },
    arabic: { type: "quran", refs: ["2:196"] },
    meaning: {
      bn: [
        "আর আল্লাহর জন্য হজ ও ওমরা পূর্ণ করো। যদি তোমরা বাধাপ্রাপ্ত হও, তবে যে কুরবানির পশু সহজলভ্য তা (পাঠাও), আর কুরবানির পশু তার জায়গায় না পৌঁছানো পর্যন্ত মাথা মুণ্ডন করো না। তোমাদের মধ্যে কেউ অসুস্থ হলে বা মাথায় কষ্ট থাকলে, সে রোজা, সদকা বা কুরবানির মাধ্যমে ফিদইয়া দেবে। আর যখন তোমরা নিরাপদ থাকো, তখন যে ব্যক্তি ওমরা করে হজ পর্যন্ত উপকৃত হয় (তামাত্তু), সে যে কুরবানির পশু সহজলভ্য তা দেবে। যে তা পায় না, সে হজের সময় তিন দিন এবং ঘরে ফিরে সাত দিন রোজা রাখবে, এই পূর্ণ দশ দিন। এই বিধান তার জন্য, যার পরিবার মসজিদুল হারামের কাছে বাস করে না। আল্লাহকে ভয় করো, আর জেনে রাখো, আল্লাহ শাস্তিদানে কঠোর।",
      ],
      en: [
        "Complete the Hajj and Umrah for Allah. If you are prevented, then offer whatever sacrifice is available, and do not shave your heads until the sacrifice reaches its place. Whoever among you is ill or has an ailment of the scalp must compensate by fasting, charity or a sacrifice. When you are safe, whoever benefits by combining Umrah with Hajj must offer whatever sacrifice is available; whoever cannot find one must fast three days during Hajj and seven when you return, ten in all. This is for those whose families do not live near the Sacred Mosque. Be mindful of Allah, and know that Allah is severe in punishment.",
      ],
    },
    tags: ["hajj", "tamattu"],
  },
  {
    id: "ayah_arafat",
    kind: "ayah",
    title: { bn: "আরাফা থেকে ফেরা", en: "Departing from Arafat" },
    arabic: { type: "quran", refs: ["2:198", "2:199"] },
    meaning: {
      bn: [
        "তোমাদের প্রতিপালকের অনুগ্রহ খোঁজায় তোমাদের কোনো দোষ নেই। যখন তোমরা আরাফাত থেকে ফিরে আসো, তখন মাশআরুল হারামের কাছে আল্লাহকে স্মরণ করো। তাঁকে স্মরণ করো যেভাবে তিনি তোমাদের পথ দেখিয়েছেন, যদিও এর আগে তোমরা পথহারাদের মধ্যে ছিলে।",
        "তারপর তোমরা সেখান থেকে ফিরে চলো, যেখান থেকে অন্য লোকেরা ফিরে চলে, আর আল্লাহর কাছে ক্ষমা চাও। নিশ্চয়ই আল্লাহ ক্ষমাশীল, পরম দয়ালু।",
      ],
      en: [
        "There is no blame on you for seeking the bounty of your Lord. When you pour down from Arafat, remember Allah at the Sacred Monument; remember Him as He has guided you, though before this you were among those astray.",
        "Then move on from where the people move on, and ask Allah's forgiveness. Allah is Forgiving, Merciful.",
      ],
    },
    tags: ["hajj", "arafah", "muzdalifah"],
  },
  {
    id: "ayah_counted_days",
    kind: "ayah",
    title: { bn: "মিনার নির্দিষ্ট দিনগুলো", en: "The counted days at Mina" },
    arabic: { type: "quran", refs: ["2:203"] },
    meaning: {
      bn: [
        "আর নির্দিষ্ট কয়েকটি দিনে আল্লাহকে স্মরণ করো। যে তাড়াতাড়ি দুই দিনে চলে যায়, তার কোনো গুনাহ নেই; আর যে দেরি করে, তারও কোনো গুনাহ নেই, এটা তার জন্য যে তাকওয়া অবলম্বন করে। আল্লাহকে ভয় করো, আর জেনে রাখো, তোমাদের সবাইকে তাঁর কাছেই একত্র করা হবে।",
      ],
      en: [
        "Remember Allah during the counted days. Whoever hurries on in two days is not at fault, and whoever stays on is not at fault, for those who are mindful of Allah. Be mindful of Allah, and know that you will all be gathered to Him.",
      ],
    },
    tags: ["hajj", "mina"],
  },
  {
    id: "ayah_safa_marwah",
    kind: "ayah",
    title: { bn: "সাফা ও মারওয়া", en: "Safa and Marwah" },
    arabic: { type: "quran", refs: ["2:158"] },
    pronunciation: "ইন্নাস সাফা ওয়াল মারওয়াতা মিন শা'আইরিল্লাহ, ফামান হাজ্জাল বাইতা আওয়ি'তামারা ফালা জুনাহা 'আলাইহি আইঁ ইয়াত্তাওয়াফা বিহিমা, ওয়া মান তাতাওয়া'আ খাইরান ফাইন্নাল্লাহা শাকিরুন 'আলীম।",
    meaning: {
      bn: [
        "নিশ্চয়ই সাফা ও মারওয়া আল্লাহর নিদর্শনগুলোর অন্তর্ভুক্ত। তাই যে ব্যক্তি এই ঘরের হজ বা ওমরা করে, তার জন্য এ দুটির মাঝে যাতায়াত (সাঈ) করায় কোনো দোষ নেই। আর যে স্বেচ্ছায় কোনো ভালো কাজ করে, আল্লাহ তার কদর করেন, তিনি সব জানেন।",
      ],
      en: [
        "Safa and Marwah are among the symbols of Allah. So whoever performs Hajj or Umrah to the House is not at fault for going back and forth between them. Whoever does good of their own accord, Allah appreciates it and knows it.",
      ],
    },
    when: {
      bn: "সাঈ শুরু করার আগে সাফার কাছে পৌঁছে পড়া হয়।",
      en: "Recited on reaching Safa, before starting sa'i.",
    },
    tags: ["umrah", "hajj", "sai"],
  },
  {
    id: "ayah_ibrahim_accept",
    kind: "ayah",
    title: { bn: "ইবরাহিম ও ইসমাইলের দোয়া", en: "The prayer of Ibrahim and Ismail" },
    arabic: { type: "quran", refs: ["2:127"] },
    pronunciation: "ওয়া ইয ইয়ারফা'উ ইবরাহীমুল কাওয়া'ইদা মিনাল বাইতি ওয়া ইসমা'ঈল, রব্বানা তাকাব্বাল মিন্না, ইন্নাকা আনতাস সামী'উল 'আলীম।",
    meaning: {
      bn: [
        "আর স্মরণ করো, যখন ইবরাহিম ও ইসমাইল এই ঘরের ভিত্তি উঁচু করছিলেন (আর দোয়া করছিলেন): হে আমাদের প্রতিপালক, আমাদের পক্ষ থেকে এটি কবুল করো; নিশ্চয়ই তুমি সব শোনো, সব জানো।",
      ],
      en: [
        "And when Ibrahim was raising the foundations of the House, with Ismail: 'Our Lord, accept this from us; You are the All-Hearing, the All-Knowing.'",
      ],
    },
    tags: ["hajj", "featured"],
  },
  {
    id: "ayah_ibrahim_valley",
    kind: "ayah",
    title: { bn: "মক্কার জন্য ইবরাহিমের দোয়া", en: "Ibrahim's prayer for Makkah" },
    arabic: { type: "quran", refs: ["14:37"] },
    meaning: {
      bn: [
        "হে আমাদের প্রতিপালক, আমি আমার কিছু বংশধরকে তোমার সম্মানিত ঘরের কাছে এক চাষাবাদহীন উপত্যকায় বসবাস করিয়েছি, হে আমাদের প্রতিপালক, যাতে তারা নামাজ কায়েম করে। তাই কিছু মানুষের অন্তর তাদের প্রতি অনুরাগী করে দাও, আর তাদের ফলমূল দিয়ে রিজিক দাও, যাতে তারা কৃতজ্ঞ হয়।",
      ],
      en: [
        "Our Lord, I have settled some of my offspring in a valley without crops, by Your Sacred House, our Lord, so that they may establish prayer. Make the hearts of some people incline towards them, and provide them with fruits, so that they may be grateful.",
      ],
    },
    tags: ["hajj", "featured"],
  },
  {
    id: "ayah_symbols",
    kind: "ayah",
    title: { bn: "আল্লাহর নিদর্শনের সম্মান", en: "Honouring the symbols of Allah" },
    arabic: { type: "quran", refs: ["22:32"] },
    pronunciation: "যালিকা ওয়া মাইঁ ইউ'আয্যিম শা'আইরাল্লাহি ফাইন্নাহা মিন তাকওয়াল কুলূব।",
    meaning: {
      bn: ["এটাই (আল্লাহর বিধান)। আর যে আল্লাহর নিদর্শনগুলোকে সম্মান করে, নিশ্চয়ই তা অন্তরের তাকওয়া থেকেই আসে।"],
      en: ["That is so. Whoever honours the symbols of Allah, that comes from the God-consciousness of hearts."],
    },
    tags: ["hajj", "featured"],
  },

  // ----------------------------------------------------------------- duas
  {
    id: "dua_talbiyah",
    kind: "dua",
    title: { bn: "তালবিয়া", en: "Talbiyah" },
    arabic: { type: "hadith", id: "talbiyah" },
    pronunciation:
      "লাব্বাইকা আল্লাহুম্মা লাব্বাইক, লাব্বাইকা লা শারীকা লাকা লাব্বাইক, ইন্নাল হামদা ওয়ান নি'মাতা লাকা ওয়াল মুলক, লা শারীকা লাক।",
    meaning: {
      bn: [
        "আমি হাজির, হে আল্লাহ, আমি হাজির। আমি হাজির, তোমার কোনো শরিক নেই, আমি হাজির। নিশ্চয়ই সমস্ত প্রশংসা আর সমস্ত নিয়ামত তোমারই, রাজত্বও তোমার। তোমার কোনো শরিক নেই।",
      ],
      en: [
        "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. All praise and all blessing are Yours, and the dominion. You have no partner.",
      ],
    },
    when: {
      bn: "ইহরাম বাঁধার পর থেকে বারবার পড়তে থাকবেন। পুরুষেরা উচ্চস্বরে, নারীরা নিচু স্বরে। ওমরায় তাওয়াফ শুরু পর্যন্ত, আর হজে ১০ জিলহজ জামরাতুল আকাবায় কঙ্কর মারা শুরু পর্যন্ত।",
      en: "Repeat from entering ihram onward, men aloud and women quietly: until tawaf begins for Umrah, and until stoning Jamrat al-Aqabah on 10 Dhul Hijjah for Hajj.",
    },
    note: {
      bn: "তালবিয়া কখন শেষ হবে, তার বিস্তারিত মাযহাব অনুযায়ী আলেমের কাছ থেকে নিশ্চিত হয়ে নিন।",
      en: "Confirm with your scholar exactly when the talbiyah ends according to your madhhab.",
    },
    tags: ["ihram", "umrah", "hajj", "featured"],
  },
  {
    id: "dua_travel",
    kind: "dua",
    title: { bn: "সফরের দোয়া", en: "The travel prayer" },
    arabic: { type: "hadith", id: "travel" },
    pronunciation:
      "সুবহানাল্লাযী সাখখারা লানা হাযা, ওয়া মা কুন্না লাহু মুকরিনীন, ওয়া ইন্না ইলা রব্বিনা লামুনকালিবূন। আল্লাহুম্মা ইন্না নাসআলুকা ফী সাফারিনা হাযাল বির্রা ওয়াত তাকওয়া, ওয়া মিনাল 'আমালি মা তারদা। আল্লাহুম্মা হাওয়্যিন 'আলাইনা সাফারানা হাযা, ওয়াতওয়ি 'আন্না বু'দাহ। আল্লাহুম্মা আনতাস সাহিবু ফিস সাফারি ওয়াল খালীফাতু ফিল আহল। আল্লাহুম্মা ইন্নী আ'ঊযু বিকা মিন ওয়া'সাইস সাফারি ওয়া কাআবাতিল মানযারি ওয়া সূইল মুনকালাবি ফিল মালি ওয়াল আহল।",
    meaning: {
      bn: [
        "পবিত্র তিনি, যিনি এটিকে আমাদের বশীভূত করে দিয়েছেন, অথচ আমরা একে বশ করতে সক্ষম ছিলাম না। আর নিশ্চয়ই আমরা আমাদের প্রতিপালকের কাছেই ফিরে যাব। হে আল্লাহ, আমরা এই সফরে তোমার কাছে পুণ্য ও তাকওয়া চাই, আর এমন কাজ চাই যাতে তুমি সন্তুষ্ট হও। হে আল্লাহ, আমাদের এই সফর সহজ করে দাও, এর দূরত্ব আমাদের জন্য কমিয়ে দাও। হে আল্লাহ, তুমিই সফরের সঙ্গী এবং (আমাদের অনুপস্থিতিতে) পরিবারের তত্ত্বাবধায়ক। হে আল্লাহ, আমি তোমার কাছে আশ্রয় চাই সফরের কষ্ট থেকে, দুঃখজনক দৃশ্য থেকে, আর ফিরে এসে সম্পদ ও পরিবারে মন্দ অবস্থা দেখা থেকে।",
      ],
      en: [
        "Glory to Him who has made this serve us, though we could not have done so ourselves, and to our Lord we will surely return. O Allah, we ask You on this journey for righteousness and mindfulness of You, and for deeds that please You. O Allah, make this journey easy for us and fold up its distance. O Allah, You are the Companion on the journey and the One who looks after the family. O Allah, I seek refuge in You from the hardship of travel, from distressing sights, and from returning to find harm in wealth or family.",
      ],
    },
    when: {
      bn: "গাড়ি, বাস বা বিমানে উঠে সফর শুরু করার সময়। শুরুতে তিনবার 'আল্লাহু আকবার' বলবেন।",
      en: "When setting out on a journey, after boarding. Say 'Allahu akbar' three times first.",
    },
    tags: ["travel", "featured"],
  },
  {
    id: "dua_travel_return",
    kind: "dua",
    title: { bn: "সফর থেকে ফেরার দোয়া", en: "On returning from travel" },
    arabic: { type: "hadith", id: "travel_return" },
    pronunciation: "আয়িবূনা তায়িবূনা 'আবিদূনা লিরব্বিনা হামিদূন।",
    meaning: {
      bn: ["আমরা ফিরে আসছি, তওবা করছি, ইবাদত করছি, আর আমাদের প্রতিপালকের প্রশংসা করছি।"],
      en: ["Returning, repenting, worshipping, and praising our Lord."],
    },
    when: {
      bn: "দেশে ফেরার সময় সফরের দোয়ার সাথে যোগ করে পড়বেন।",
      en: "Added to the travel prayer on the way home.",
    },
    tags: ["travel"],
  },
  {
    id: "dua_masjid_enter",
    kind: "dua",
    title: { bn: "মসজিদে প্রবেশের দোয়া", en: "Entering the mosque" },
    arabic: { type: "hadith", id: "masjid_enter" },
    pronunciation: "আল্লাহুম্মাফতাহ লী আবওয়াবা রহমাতিক।",
    meaning: {
      bn: ["হে আল্লাহ, আমার জন্য তোমার রহমতের দরজাগুলো খুলে দাও।"],
      en: ["O Allah, open for me the doors of Your mercy."],
    },
    when: {
      bn: "মসজিদুল হারাম, মসজিদে নববি বা যেকোনো মসজিদে প্রবেশের সময়।",
      en: "On entering the Sacred Mosque, the Prophet's Mosque or any mosque.",
    },
    tags: ["masjid", "umrah"],
  },
  {
    id: "dua_masjid_exit",
    kind: "dua",
    title: { bn: "মসজিদ থেকে বের হওয়ার দোয়া", en: "Leaving the mosque" },
    arabic: { type: "hadith", id: "masjid_exit" },
    pronunciation: "আল্লাহুম্মা ইন্নী আসআলুকা মিন ফাদলিক।",
    meaning: {
      bn: ["হে আল্লাহ, আমি তোমার কাছে তোমার অনুগ্রহ চাই।"],
      en: ["O Allah, I ask You of Your bounty."],
    },
    when: { bn: "মসজিদ থেকে বের হওয়ার সময়।", en: "On leaving the mosque." },
    tags: ["masjid"],
  },
  {
    id: "dua_rukn_yamani",
    kind: "dua",
    title: { bn: "রুকনে ইয়ামানি ও হাজরে আসওয়াদের মাঝে", en: "Between the Yemeni Corner and the Black Stone" },
    arabic: { type: "hadith", id: "rukn_yamani" },
    pronunciation: "রব্বানা আতিনা ফিদ দুনইয়া হাসানাহ, ওয়া ফিল আখিরাতি হাসানাহ, ওয়া কিনা 'আযাবান নার।",
    meaning: {
      bn: ["হে আমাদের প্রতিপালক, আমাদের দুনিয়াতে কল্যাণ দাও, আখিরাতেও কল্যাণ দাও, আর আমাদের আগুনের শাস্তি থেকে রক্ষা করো।"],
      en: ["Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire."],
    },
    when: {
      bn: "তাওয়াফের প্রতিটি চক্করে রুকনে ইয়ামানি থেকে হাজরে আসওয়াদ পর্যন্ত হাঁটার সময়।",
      en: "In every round of tawaf, while walking from the Yemeni Corner to the Black Stone.",
    },
    note: {
      bn: "এই শব্দগুলো সূরা আল-বাকারার ২০১ নম্বর আয়াতেরও অংশ।",
      en: "These words are also part of Surah Al-Baqarah, ayah 201.",
    },
    tags: ["tawaf", "umrah", "hajj", "receipt"],
  },
  {
    id: "dua_safa_start",
    kind: "dua",
    title: { bn: "সাঈ শুরুর কথা", en: "Beginning sa'i" },
    arabic: { type: "hadith", id: "safa_start" },
    pronunciation: "আবদাউ বিমা বাদাআল্লাহু বিহ।",
    meaning: {
      bn: ["আল্লাহ যা দিয়ে শুরু করেছেন, আমি তা দিয়েই শুরু করছি।"],
      en: ["I begin with what Allah began with."],
    },
    when: {
      bn: "সাফার কাছে পৌঁছে সূরা আল-বাকারার ১৫৮ নম্বর আয়াত পড়ার পর।",
      en: "On reaching Safa, after reciting Surah Al-Baqarah 158.",
    },
    tags: ["sai", "umrah", "hajj"],
  },
  {
    id: "dua_safa_marwah",
    kind: "dua",
    title: { bn: "সাফা ও মারওয়ার উপরে", en: "On Safa and Marwah" },
    arabic: { type: "hadith", id: "safa_marwah" },
    pronunciation:
      "লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারীকা লাহু, লাহুল মুলকু ওয়া লাহুল হামদু, ওয়া হুয়া 'আলা কুল্লি শাইয়িন কাদীর। লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু, আনজাযা ওয়া'দাহু, ওয়া নাসারা 'আবদাহু, ওয়া হাযামাল আহযাবা ওয়াহদাহ।",
    meaning: {
      bn: [
        "আল্লাহ ছাড়া কোনো ইলাহ নেই, তিনি এক, তাঁর কোনো শরিক নেই। রাজত্ব তাঁরই, প্রশংসাও তাঁরই, আর তিনি সবকিছুর ওপর ক্ষমতাবান। আল্লাহ ছাড়া কোনো ইলাহ নেই, তিনি এক। তিনি তাঁর প্রতিশ্রুতি পূর্ণ করেছেন, তাঁর বান্দাকে সাহায্য করেছেন, আর একাই শত্রুবাহিনীকে পরাজিত করেছেন।",
      ],
      en: [
        "There is no god but Allah alone, without partner. His is the dominion and His the praise, and He has power over all things. There is no god but Allah alone. He fulfilled His promise, gave victory to His servant, and alone defeated the confederates.",
      ],
    },
    when: {
      bn: "সাফা ও মারওয়ায় উঠে কাবার দিকে মুখ করে তিনবার পড়বেন, মাঝে মাঝে নিজের ভাষায় দোয়া করবেন।",
      en: "On Safa and Marwah, facing the Kaabah: say it three times, making your own dua in between.",
    },
    tags: ["sai", "umrah", "hajj"],
  },
  {
    id: "dua_arafah",
    kind: "dua",
    title: { bn: "আরাফার দিনের শ্রেষ্ঠ দোয়া", en: "The best dua of the Day of Arafah" },
    arabic: { type: "hadith", id: "arafah" },
    pronunciation: "লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারীকা লাহু, লাহুল মুলকু ওয়া লাহুল হামদু, ওয়া হুয়া 'আলা কুল্লি শাইয়িন কাদীর।",
    meaning: {
      bn: ["আল্লাহ ছাড়া কোনো ইলাহ নেই, তিনি এক, তাঁর কোনো শরিক নেই। রাজত্ব তাঁরই, প্রশংসাও তাঁরই, আর তিনি সবকিছুর ওপর ক্ষমতাবান।"],
      en: ["There is no god but Allah alone, without partner. His is the dominion and His the praise, and He has power over all things."],
    },
    when: {
      bn: "৯ জিলহজ আরাফার ময়দানে, যত বেশি সম্ভব। নবীজি বলেছেন, সবচেয়ে উত্তম দোয়া আরাফার দিনের দোয়া।",
      en: "On 9 Dhul Hijjah at Arafah, as often as you can. The Prophet said the best dua is the dua of the Day of Arafah.",
    },
    note: {
      bn: "ইমাম তিরমিযি এই সনদকে 'হাসান গরিব' বলেছেন। অন্য সূত্রের কারণে অনেক আলেম হাদিসটিকে হাসান বলেছেন।",
      en: "At-Tirmidhi graded this chain hasan gharib; many scholars consider the hadith hasan due to supporting chains.",
    },
    tags: ["arafah", "hajj", "featured"],
  },

  // --------------------------------------------------------------- hadith
  {
    id: "hadith_reward",
    kind: "hadith",
    title: { bn: "নিষ্পাপ হয়ে ফেরা", en: "Returning free of sin" },
    arabic: { type: "hadith", id: "hajj_reward" },
    meaning: {
      bn: ["যে ব্যক্তি আল্লাহর জন্য হজ করে, আর (হজের সময়) অশ্লীল কথা-কাজ ও পাপাচার থেকে বিরত থাকে, সে সদ্য জন্ম নেওয়া শিশুর মতো (নিষ্পাপ হয়ে) ফিরে আসে।"],
      en: ["Whoever performs Hajj for Allah, avoiding obscenity and wrongdoing, returns like the day his mother gave birth to him."],
    },
    tags: ["hajj", "featured"],
  },
  {
    id: "hadith_mabrur",
    kind: "hadith",
    title: { bn: "মাবরুর হজের প্রতিদান", en: "The reward of an accepted Hajj" },
    arabic: { type: "hadith", id: "hajj_mabrur" },
    meaning: {
      bn: ["এক ওমরা থেকে আরেক ওমরা, এর মাঝের (গুনাহের) কাফফারা। আর মাবরুর (কবুল) হজের প্রতিদান জান্নাত ছাড়া আর কিছু নয়।"],
      en: ["One Umrah to the next is an expiation for what is between them, and an accepted Hajj has no reward other than Paradise."],
    },
    tags: ["hajj", "umrah", "featured"],
  },
];

// ----------------------------------------------------------------- sunnah

export interface SunnahPractice {
  id: string;
  text: Text;
  /** Hadith or Quran reference shown under the practice. */
  source: Text;
}

export const SUNNAH: SunnahPractice[] = [
  {
    id: "ihram_ghusl",
    text: { bn: "ইহরাম বাঁধার আগে গোসল করা।", en: "Taking a bath before entering ihram." },
    source: { bn: "জামে তিরমিযি ৮৩০", en: "Jami at-Tirmidhi 830" },
  },
  {
    id: "talbiyah_loud",
    text: { bn: "পুরুষদের জন্য উচ্চস্বরে তালবিয়া পড়া।", en: "Men reciting the talbiyah aloud." },
    source: { bn: "সুনানে আবু দাউদ ১৮১৪", en: "Sunan Abi Dawud 1814" },
  },
  {
    id: "idtiba",
    text: {
      bn: "ওমরার তাওয়াফে পুরুষদের ইদতিবা: চাদর ডান বগলের নিচ দিয়ে এনে বাম কাঁধে রাখা, ডান কাঁধ খোলা থাকবে।",
      en: "Idtiba for men in the Umrah tawaf: the upper cloth under the right arm and over the left shoulder, leaving the right shoulder bare.",
    },
    source: { bn: "সুনানে আবু দাউদ ১৮৮৯", en: "Sunan Abi Dawud 1889" },
  },
  {
    id: "ramal",
    text: {
      bn: "তাওয়াফের প্রথম তিন চক্করে পুরুষদের ছোট ছোট পদক্ষেপে দ্রুত হাঁটা (রমল), বাকি চার চক্কর স্বাভাবিক হাঁটা।",
      en: "Ramal for men: brisk, short steps in the first three rounds of tawaf, walking normally in the remaining four.",
    },
    source: { bn: "সহিহ বুখারি ১৬০৩", en: "Sahih al-Bukhari 1603" },
  },
  {
    id: "black_stone",
    text: {
      bn: "হাজরে আসওয়াদ চুম্বন বা স্পর্শ করা; ভিড় থাকলে দূর থেকে ইশারা করে 'আল্লাহু আকবার' বলা।",
      en: "Kissing or touching the Black Stone; in a crowd, pointing to it from a distance and saying 'Allahu akbar'.",
    },
    source: { bn: "সহিহ বুখারি ১৫৯৭, ১৬১৩", en: "Sahih al-Bukhari 1597, 1613" },
  },
  {
    id: "rukn_dua",
    text: {
      bn: "রুকনে ইয়ামানি ও হাজরে আসওয়াদের মাঝে 'রব্বানা আতিনা...' দোয়া পড়া।",
      en: "Saying 'Rabbana atina...' between the Yemeni Corner and the Black Stone.",
    },
    source: { bn: "সুনানে আবু দাউদ ১৮৯২", en: "Sunan Abi Dawud 1892" },
  },
  {
    id: "maqam_prayer",
    text: {
      bn: "তাওয়াফ শেষে মাকামে ইবরাহিমের পেছনে দুই রাকাত নামাজ, যাতে সূরা কাফিরুন ও সূরা ইখলাস পড়া।",
      en: "Two rak'ahs behind Maqam Ibrahim after tawaf, reciting Surah Al-Kafirun and Surah Al-Ikhlas.",
    },
    source: { bn: "সহিহ মুসলিম ১২১৮; সূরা আল-বাকারা ১২৫", en: "Sahih Muslim 1218; Al-Baqarah 125" },
  },
  {
    id: "zamzam",
    text: { bn: "তাওয়াফের পর জমজমের পানি পান করা।", en: "Drinking Zamzam water after tawaf." },
    source: { bn: "সহিহ বুখারি ১৬৩৭", en: "Sahih al-Bukhari 1637" },
  },
  {
    id: "safa_first",
    text: {
      bn: "সাঈ সাফা থেকে শুরু করা, আর সাফা ও মারওয়ায় কাবার দিকে মুখ করে আল্লাহর একত্ব ঘোষণা ও দোয়া করা।",
      en: "Starting sa'i at Safa, and on Safa and Marwah facing the Kaabah to declare Allah's oneness and make dua.",
    },
    source: { bn: "সহিহ মুসলিম ১২১৮", en: "Sahih Muslim 1218" },
  },
  {
    id: "tarwiyah",
    text: {
      bn: "৮ জিলহজ (তারবিয়ার দিন) মিনায় যাওয়া এবং সেখানে জোহর থেকে পরদিন ফজর পর্যন্ত নামাজ আদায় করা।",
      en: "Going to Mina on 8 Dhul Hijjah and praying there from Dhuhr until the next Fajr.",
    },
    source: { bn: "সহিহ মুসলিম ১২১৮", en: "Sahih Muslim 1218" },
  },
  {
    id: "arafah_dua",
    text: { bn: "আরাফার দিনে বেশি বেশি দোয়া ও যিকির করা।", en: "Making abundant dua and dhikr on the Day of Arafah." },
    source: { bn: "জামে তিরমিযি ৩৫৮৫", en: "Jami at-Tirmidhi 3585" },
  },
  {
    id: "jamarat",
    text: {
      bn: "প্রতিটি কঙ্কর মারার সময় 'আল্লাহু আকবার' বলা, আর প্রথম ও দ্বিতীয় জামরার পর কিবলামুখী হয়ে হাত তুলে দীর্ঘ দোয়া করা।",
      en: "Saying 'Allahu akbar' with each pebble, and after the first and second jamrah facing the qiblah with raised hands in long dua.",
    },
    source: { bn: "সহিহ বুখারি ১৭৫১", en: "Sahih al-Bukhari 1751" },
  },
  {
    id: "farewell",
    text: {
      bn: "মক্কা ছাড়ার আগে শেষ কাজ হিসেবে বিদায়ী তাওয়াফ করা।",
      en: "Making the farewell tawaf as the last act before leaving Makkah.",
    },
    source: { bn: "সহিহ বুখারি ১৭৫৫", en: "Sahih al-Bukhari 1755" },
  },
];

// ------------------------------------------------------------------ steps

export interface GuideStep {
  id: string;
  phase: "umrah" | "hajj";
  /** Short label such as the day of Dhul Hijjah. */
  label: Text;
  title: Text;
  body: Text;
  items: string[];
  sunnah: string[];
}

export const STEPS: GuideStep[] = [
  {
    id: "umrah_ihram",
    phase: "umrah",
    label: { bn: "ধাপ ১", en: "Step 1" },
    title: { bn: "মিকাত থেকে ইহরাম", en: "Ihram from the miqat" },
    body: {
      bn: "নখ ও অবাঞ্ছিত লোম পরিষ্কার করে গোসল করবেন। পুরুষেরা সেলাইবিহীন দুই টুকরো সাদা কাপড় পরবেন, নারীরা স্বাভাবিক শালীন পোশাকে থাকবেন। মিকাত পার হওয়ার আগে ওমরার নিয়ত করে তালবিয়া শুরু করবেন। বিমানে গেলে মিকাতের ঘোষণার আগেই প্রস্তুত থাকুন।",
      en: "Trim nails, clean up and take a bath. Men wear two unstitched white sheets; women wear their normal modest clothing. Before crossing the miqat, make the intention for Umrah and begin the talbiyah. If flying, be ready before the miqat is announced.",
    },
    items: ["dua_travel", "dua_talbiyah", "ayah_hajj_months"],
    sunnah: ["ihram_ghusl", "talbiyah_loud"],
  },
  {
    id: "umrah_tawaf",
    phase: "umrah",
    label: { bn: "ধাপ ২", en: "Step 2" },
    title: { bn: "মসজিদুল হারাম ও তাওয়াফ", en: "The Sacred Mosque and tawaf" },
    body: {
      bn: "দোয়া পড়ে ডান পা দিয়ে মসজিদে প্রবেশ করবেন। হাজরে আসওয়াদ থেকে শুরু করে কাবাকে বাম দিকে রেখে সাত চক্কর তাওয়াফ করবেন। প্রতি চক্করে হাজরে আসওয়াদের দিকে ইশারা করে তাকবির বলবেন, আর রুকনে ইয়ামানি থেকে হাজরে আসওয়াদ পর্যন্ত 'রব্বানা আতিনা...' পড়বেন। বাকি সময় নিজের ভাষায় যেকোনো দোয়া করা যায়।",
      en: "Enter the mosque with the right foot, saying the dua. Starting at the Black Stone, walk seven rounds with the Kaabah on your left. Each round, point to the Black Stone and say the takbir, and say 'Rabbana atina...' between the Yemeni Corner and the Black Stone. At other times, make any dua in your own words.",
    },
    items: ["dua_masjid_enter", "dua_rukn_yamani"],
    sunnah: ["idtiba", "ramal", "black_stone", "rukn_dua"],
  },
  {
    id: "umrah_maqam",
    phase: "umrah",
    label: { bn: "ধাপ ৩", en: "Step 3" },
    title: { bn: "মাকামে ইবরাহিমে দুই রাকাত ও জমজম", en: "Two rak'ahs at Maqam Ibrahim and Zamzam" },
    body: {
      bn: "তাওয়াফ শেষে সম্ভব হলে মাকামে ইবরাহিমের পেছনে, না হলে মসজিদের যেকোনো জায়গায় দুই রাকাত নামাজ পড়বেন। তারপর জমজমের পানি পান করবেন।",
      en: "After tawaf, pray two rak'ahs behind Maqam Ibrahim if possible, otherwise anywhere in the mosque. Then drink Zamzam water.",
    },
    items: ["surah_kafirun", "surah_ikhlas"],
    sunnah: ["maqam_prayer", "zamzam"],
  },
  {
    id: "umrah_sai",
    phase: "umrah",
    label: { bn: "ধাপ ৪", en: "Step 4" },
    title: { bn: "সাফা ও মারওয়ার মাঝে সাঈ", en: "Sa'i between Safa and Marwah" },
    body: {
      bn: "সাফা থেকে শুরু করে মারওয়ায় শেষ করে সাতবার যাতায়াত করবেন: সাফা থেকে মারওয়া এক, মারওয়া থেকে সাফা দুই। সবুজ বাতির মাঝখানে পুরুষেরা একটু দ্রুত হাঁটবেন।",
      en: "Walk seven times between Safa and Marwah, starting at Safa and ending at Marwah: Safa to Marwah is one, back is two. Men walk a little faster between the green lights.",
    },
    items: ["ayah_safa_marwah", "dua_safa_start", "dua_safa_marwah"],
    sunnah: ["safa_first"],
  },
  {
    id: "umrah_halq",
    phase: "umrah",
    label: { bn: "ধাপ ৫", en: "Step 5" },
    title: { bn: "মাথা মুণ্ডন বা চুল ছোট করা", en: "Shaving or shortening the hair" },
    body: {
      bn: "পুরুষেরা মাথা মুণ্ডন করবেন বা পুরো মাথার চুল ছোট করবেন, নারীরা চুলের আগা থেকে আঙুলের এক কর পরিমাণ কাটবেন। এর মাধ্যমে ওমরা পূর্ণ হয় এবং ইহরামের নিষেধাজ্ঞা উঠে যায়।",
      en: "Men shave the head or shorten the hair all over; women cut about a fingertip's length from the ends. This completes the Umrah and lifts the restrictions of ihram.",
    },
    items: ["ayah_complete_hajj"],
    sunnah: [],
  },
  {
    id: "hajj_day8",
    phase: "hajj",
    label: { bn: "৮ জিলহজ", en: "8 Dhul Hijjah" },
    title: { bn: "হজের ইহরাম ও মিনা", en: "Ihram for Hajj and Mina" },
    body: {
      bn: "মক্কায় নিজের জায়গা থেকে হজের নিয়তে ইহরাম বেঁধে তালবিয়া পড়তে পড়তে মিনায় যাবেন। সেখানে জোহর, আসর, মাগরিব, এশা ও পরদিন ফজর আদায় করবেন।",
      en: "Enter ihram for Hajj from where you are staying in Makkah and go to Mina with the talbiyah. Pray Dhuhr, Asr, Maghrib, Isha and the next Fajr there.",
    },
    items: ["dua_talbiyah"],
    sunnah: ["tarwiyah"],
  },
  {
    id: "hajj_day9",
    phase: "hajj",
    label: { bn: "৯ জিলহজ", en: "9 Dhul Hijjah" },
    title: { bn: "আরাফা, তারপর মুজদালিফা", en: "Arafah, then Muzdalifah" },
    body: {
      bn: "সূর্যোদয়ের পর আরাফায় যাবেন। আরাফায় অবস্থানই হজের মূল কাজ। সূর্যাস্ত পর্যন্ত কিবলামুখী হয়ে বেশি বেশি দোয়া, যিকির ও ইস্তিগফার করবেন। সূর্যাস্তের পর মুজদালিফায় গিয়ে মাগরিব ও এশা একসাথে পড়বেন, সেখানে রাত কাটাবেন, কঙ্কর সংগ্রহ করবেন, আর ফজরের পর আকাশ ফর্সা হওয়া পর্যন্ত যিকির করবেন।",
      en: "After sunrise go to Arafah. Standing at Arafah is the heart of Hajj: until sunset, face the qiblah in dua, dhikr and seeking forgiveness. After sunset go to Muzdalifah, pray Maghrib and Isha together, spend the night, collect pebbles, and remember Allah after Fajr until the sky is bright.",
    },
    items: ["dua_arafah", "ayah_arafat"],
    sunnah: ["arafah_dua"],
  },
  {
    id: "hajj_day10",
    phase: "hajj",
    label: { bn: "১০ জিলহজ", en: "10 Dhul Hijjah" },
    title: { bn: "কঙ্কর, কুরবানি, মুণ্ডন ও তাওয়াফ", en: "Stoning, sacrifice, shaving and tawaf" },
    body: {
      bn: "জামরাতুল আকাবায় সাতটি কঙ্কর মারবেন, প্রতিটির সাথে তাকবির। তামাত্তু ও কিরান হজকারীরা কুরবানি দেবেন। তারপর মাথা মুণ্ডন বা চুল ছোট করবেন। এরপর মক্কায় গিয়ে তাওয়াফে যিয়ারত (ইফাদা) ও সাঈ করবেন। এই কাজগুলোর ক্রম মাযহাব অনুযায়ী আলেমের কাছ থেকে জেনে নিন।",
      en: "Throw seven pebbles at Jamrat al-Aqabah with a takbir for each. Those doing tamattu or qiran offer the sacrifice, then shave or shorten the hair, then go to Makkah for tawaf al-ifadah and sa'i. Confirm the order of these acts with your scholar according to your madhhab.",
    },
    items: ["ayah_proclaim"],
    sunnah: ["jamarat"],
  },
  {
    id: "hajj_days11_13",
    phase: "hajj",
    label: { bn: "১১–১৩ জিলহজ", en: "11–13 Dhul Hijjah" },
    title: { bn: "মিনায় রাত যাপন ও তিন জামরা", en: "Nights at Mina and the three jamarat" },
    body: {
      bn: "মিনায় রাত কাটাবেন। প্রতিদিন দুপুরের পর ছোট, মাঝারি ও বড় জামরায় সাতটি করে কঙ্কর মারবেন। কেউ চাইলে ১২ তারিখ সূর্যাস্তের আগে মিনা ছাড়তে পারেন, অথবা ১৩ তারিখ পর্যন্ত থাকতে পারেন।",
      en: "Spend the nights at Mina. Each day after noon, throw seven pebbles at the small, middle and large jamrah. You may leave Mina before sunset on the 12th, or stay until the 13th.",
    },
    items: ["ayah_counted_days"],
    sunnah: ["jamarat"],
  },
  {
    id: "hajj_farewell",
    phase: "hajj",
    label: { bn: "দেশে ফেরার আগে", en: "Before going home" },
    title: { bn: "বিদায়ী তাওয়াফ", en: "The farewell tawaf" },
    body: {
      bn: "মক্কা ছাড়ার আগে শেষ কাজ হিসেবে বিদায়ী তাওয়াফ করবেন, তারপর সফরের দোয়া পড়ে রওনা দেবেন।",
      en: "Make the farewell tawaf as your last act in Makkah, then set out with the travel prayer.",
    },
    items: ["dua_travel_return", "hadith_mabrur"],
    sunnah: ["farewell"],
  },
];

/** The ayah printed on money receipts (chosen by the agency). */
export const RECEIPT_ITEM_ID = "ayah_ibrahim_accept";
