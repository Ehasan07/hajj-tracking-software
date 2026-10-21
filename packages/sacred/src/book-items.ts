/**
 * Items for the public guide book: Ayat al-Kursi, the close of al-Baqarah,
 * the short surahs recited in prayer, the words of the prayer itself, daily
 * duas, and what is said at the rites of Umrah, Hajj and the visit to
 * Madinah.
 *
 * Like content.ts this file holds no Arabic script (a test enforces it);
 * the Arabic comes from src/generated/*. Pronunciation and meanings are
 * drafts until a scholar approves them.
 */
import type { SacredItem } from "./content";

const quran = (refs: string[]) => ({ type: "quran" as const, refs });
const hadith = (id: string) => ({ type: "hadith" as const, id });
const quranParts = (ids: string[]) => ({ type: "quranParts" as const, ids });
const ayat = (surah: number, count: number) => Array.from({ length: count }, (_, i) => `${surah}:${i + 1}`);

/* ---------------------------------------------------------------- Quran */

const SURAHS: SacredItem[] = [
  {
    id: "ayatul_kursi",
    kind: "ayah",
    title: { bn: "আয়াতুল কুরসি", en: "Ayat al-Kursi" },
    arabic: quran(["2:255"]),
    pronunciation:
      "আল্লাহু লা ইলাহা ইল্লা হুওয়াল হাইয়্যুল কাইয়্যুম। লা তা'খুযুহূ সিনাতুঁও ওয়ালা নাওম। লাহূ মা ফিস সামাওয়াতি ওয়ামা ফিল আরদ্‌। মান যাল্লাযী ইয়াশফা'উ 'ইনদাহূ ইল্লা বিইযনিহ্‌। ইয়া'লামু মা বাইনা আইদীহিম ওয়ামা খালফাহুম, ওয়ালা ইউহীতূনা বিশাইয়িম মিন 'ইলমিহী ইল্লা বিমা শা-আ। ওয়াসি'আ কুরসিয়্যুহুস সামাওয়াতি ওয়াল আরদ্‌, ওয়ালা ইয়াঊদুহূ হিফযুহুমা, ওয়া হুওয়াল 'আলিয়্যুল 'আযীম।",
    meaning: {
      bn: [
        "আল্লাহ, তিনি ছাড়া কোনো উপাস্য নেই; তিনি চিরঞ্জীব, সবকিছুর ধারক। তন্দ্রা তাঁকে স্পর্শ করে না, ঘুমও না। আসমানে যা আছে আর জমিনে যা আছে, সব তাঁরই। কে আছে, যে তাঁর অনুমতি ছাড়া তাঁর কাছে সুপারিশ করবে? মানুষের সামনে ও পেছনে যা আছে, তিনি সব জানেন; আর তিনি যতটুকু চান তার বাইরে তাঁর জ্ঞানের কিছুই তারা আয়ত্ত করতে পারে না। তাঁর কুরসি আসমান ও জমিন জুড়ে বিস্তৃত, আর এ দুটির রক্ষণাবেক্ষণ তাঁকে ক্লান্ত করে না। তিনি সর্বোচ্চ, মহান।",
      ],
      en: [
        "Allah: there is no god but Him, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him. To Him belongs whatever is in the heavens and whatever is on the earth. Who could intercede with Him except by His leave? He knows what is before them and what is behind them, and they grasp nothing of His knowledge except what He wills. His Seat extends over the heavens and the earth, and guarding them does not tire Him. He is the Most High, the Supreme.",
      ],
    },
    when: {
      bn: "প্রতি ফরজ নামাজের পর এবং রাতে ঘুমানোর আগে।",
      en: "After every obligatory prayer, and before going to sleep at night.",
    },
    tags: ["book", "quran", "salah", "daily"],
  },
  {
    id: "baqarah_end",
    kind: "ayah",
    title: { bn: "সূরা বাকারার শেষ দুই আয়াত", en: "The last two ayat of Al-Baqarah" },
    arabic: quran(["2:285", "2:286"]),
    pronunciation: [
      "আমানার রাসূলু বিমা উনযিলা ইলাইহি মির রাব্বিহী ওয়াল মু'মিনূন। কুল্লুন আমানা বিল্লাহি ওয়া মালা-ইকাতিহী ওয়া কুতুবিহী ওয়া রুসুলিহ্‌। লা নুফাররিকু বাইনা আহাদিম মির রুসুলিহ্‌। ওয়া কালূ সামি'না ওয়া আতা'না, গুফরা-নাকা রাব্বানা ওয়া ইলাইকাল মাসীর।",
      "লা ইউকাল্লিফুল্লাহু নাফসান ইল্লা উস'আহা। লাহা মা কাসাবাত ওয়া 'আলাইহা মাকতাসাবাত। রাব্বানা লা তুআ-খিযনা ইন নাসীনা আও আখতা'না। রাব্বানা ওয়ালা তাহমিল 'আলাইনা ইসরান কামা হামালতাহূ 'আলাল্লাযীনা মিন কাবলিনা। রাব্বানা ওয়ালা তুহাম্মিলনা মা লা তা-কাতা লানা বিহ্‌। ওয়া'ফু 'আন্না, ওয়াগফির লানা, ওয়ারহামনা, আনতা মাওলা-না ফানসুরনা 'আলাল কাওমিল কা-ফিরীন।",
    ].join("\n"),
    meaning: {
      bn: [
        "রাসূল তাঁর প্রতিপালকের পক্ষ থেকে তাঁর কাছে যা নাজিল হয়েছে তাতে ঈমান এনেছেন, আর মুমিনরাও। সবাই ঈমান এনেছে আল্লাহর প্রতি, তাঁর ফেরেশতাদের প্রতি, তাঁর কিতাবগুলোর প্রতি ও তাঁর রাসূলদের প্রতি। (তারা বলে) আমরা তাঁর রাসূলদের কারো মধ্যে পার্থক্য করি না। আর তারা বলে: আমরা শুনলাম ও মানলাম; হে আমাদের প্রতিপালক, আমরা তোমার ক্ষমা চাই, আর তোমার কাছেই ফিরে যেতে হবে।",
        "আল্লাহ কাউকে তার সাধ্যের বাইরে দায়িত্ব দেন না। সে যে ভালো কাজ করেছে তার ফল তারই, আর যে মন্দ কাজ করেছে তার দায়ও তারই। হে আমাদের প্রতিপালক, আমরা যদি ভুলে যাই বা ভুল করি, আমাদের পাকড়াও কোরো না। হে আমাদের প্রতিপালক, আমাদের আগের লোকদের ওপর যেমন ভারী বোঝা চাপিয়েছিলে, আমাদের ওপর তেমন বোঝা চাপিয়ো না। হে আমাদের প্রতিপালক, যা বহন করার শক্তি আমাদের নেই, তা আমাদের ওপর চাপিয়ো না। আমাদের মাফ করো, আমাদের ক্ষমা করো, আমাদের প্রতি দয়া করো। তুমিই আমাদের অভিভাবক; অতএব অবিশ্বাসী সম্প্রদায়ের বিরুদ্ধে আমাদের সাহায্য করো।",
      ],
      en: [
        "The Messenger believes in what has been sent down to him from his Lord, and so do the believers. Each believes in Allah, His angels, His books and His messengers: 'We make no distinction between any of His messengers.' And they say, 'We hear and we obey. Your forgiveness, our Lord; and to You is the return.'",
        "Allah does not burden any soul beyond what it can bear. It gains what good it has done and bears what evil it has done. 'Our Lord, do not take us to task if we forget or make a mistake. Our Lord, do not lay on us a burden like the one You laid on those before us. Our Lord, do not load us with what we have no strength to bear. Pardon us, forgive us and have mercy on us. You are our Protector, so help us against those who disbelieve.'",
      ],
    },
    when: { bn: "রাতে ঘুমানোর আগে পড়া উত্তম।", en: "Best recited at night before sleeping." },
    tags: ["book", "quran", "daily"],
  },
  {
    id: "surah_takathur",
    kind: "surah",
    title: { bn: "সূরা আত-তাকাসুর", en: "Surah At-Takathur" },
    arabic: quran(ayat(102, 8)),
    pronunciation: [
      "আলহা-কুমুত তাকা-সুর।",
      "হাত্তা যুরতুমুল মাকা-বির।",
      "কাল্লা সাওফা তা'লামূন।",
      "সুম্মা কাল্লা সাওফা তা'লামূন।",
      "কাল্লা লাও তা'লামূনা 'ইলমাল ইয়াকীন।",
      "লাতারাউন্নাল জাহীম।",
      "সুম্মা লাতারাউন্নাহা 'আইনাল ইয়াকীন।",
      "সুম্মা লাতুস'আলুন্না ইয়াওমা-ইযিন 'আনিন না'ঈম।",
    ].join("\n"),
    meaning: {
      bn: [
        "বেশি পাওয়ার প্রতিযোগিতা তোমাদের উদাসীন করে রেখেছে,",
        "যতক্ষণ না তোমরা কবরে পৌঁছে যাও।",
        "কখনো নয়, শীঘ্রই তোমরা জানতে পারবে।",
        "আবারও বলি, কখনো নয়, শীঘ্রই তোমরা জানতে পারবে।",
        "কখনো নয়, যদি তোমরা নিশ্চিত জ্ঞানে জানতে!",
        "তোমরা অবশ্যই জাহান্নাম দেখবে।",
        "তারপর তোমরা তা অবশ্যই দেখবে নিশ্চিত চোখে।",
        "তারপর সেদিন তোমাদের অবশ্যই নিয়ামতগুলো সম্পর্কে জিজ্ঞেস করা হবে।",
      ],
      en: [
        "Competing for more distracts you",
        "until you visit the graves.",
        "No! You will soon know.",
        "Again, no! You will soon know.",
        "No! If only you knew with certain knowledge,",
        "you would surely see the Blaze.",
        "Then you will surely see it with the eye of certainty.",
        "Then on that Day you will surely be asked about the blessings.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_asr",
    kind: "surah",
    title: { bn: "সূরা আল-আসর", en: "Surah Al-Asr" },
    arabic: quran(ayat(103, 3)),
    pronunciation: ["ওয়াল 'আসর।", "ইন্নাল ইনসা-না লাফী খুসর।", "ইল্লাল্লাযীনা আ-মানূ ওয়া 'আমিলুস সা-লিহা-তি ওয়া তাওয়া-সাও বিল হাক্কি ওয়া তাওয়া-সাও বিস সাবর।"].join("\n"),
    meaning: {
      bn: [
        "সময়ের শপথ,",
        "নিশ্চয়ই মানুষ ক্ষতির মধ্যে আছে,",
        "তবে তারা নয়, যারা ঈমান এনেছে ও সৎকাজ করেছে, আর পরস্পরকে সত্যের উপদেশ দিয়েছে ও ধৈর্যের উপদেশ দিয়েছে।",
      ],
      en: ["By time,", "mankind is surely in loss,", "except those who believe and do good deeds, and urge one another to the truth and urge one another to patience."],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_humazah",
    kind: "surah",
    title: { bn: "সূরা আল-হুমাযাহ", en: "Surah Al-Humazah" },
    arabic: quran(ayat(104, 9)),
    pronunciation: [
      "ওয়াইলুল লিকুল্লি হুমাযাতিল লুমাযাহ্‌।",
      "আল্লাযী জামা'আ মা-লাঁও ওয়া 'আদ্দাদাহ্‌।",
      "ইয়াহসাবু আন্না মা-লাহূ আখলাদাহ্‌।",
      "কাল্লা লাইউমবাযান্না ফিল হুতামাহ্‌।",
      "ওয়ামা আদরা-কা মাল হুতামাহ্‌।",
      "না-রুল্লা-হিল মূকাদাহ্‌।",
      "আল্লাতী তাত্তালি'উ 'আলাল আফ'ইদাহ্‌।",
      "ইন্নাহা 'আলাইহিম মু'সাদাহ্‌।",
      "ফী 'আমাদিম মুমাদ্দাদাহ্‌।",
    ].join("\n"),
    meaning: {
      bn: [
        "দুর্ভোগ প্রত্যেক এমন ব্যক্তির, যে সামনে ও পেছনে মানুষের নিন্দা করে,",
        "যে সম্পদ জমা করে আর বারবার তা গোনে।",
        "সে ভাবে, তার সম্পদ তাকে চিরকাল বাঁচিয়ে রাখবে।",
        "কখনো নয়, তাকে অবশ্যই হুতামায় নিক্ষেপ করা হবে।",
        "তুমি কি জানো, হুতামা কী?",
        "তা আল্লাহর প্রজ্বলিত আগুন,",
        "যা হৃদয় পর্যন্ত পৌঁছে যাবে।",
        "নিশ্চয়ই তা তাদের ওপর বন্ধ করে দেওয়া হবে,",
        "লম্বা লম্বা স্তম্ভে।",
      ],
      en: [
        "Woe to every slanderer and backbiter,",
        "who gathers wealth and counts it over,",
        "thinking his wealth will make him last forever.",
        "No! He will surely be thrown into the Crusher.",
        "And what will make you know what the Crusher is?",
        "It is the fire of Allah, kindled,",
        "which rises over the hearts.",
        "It will be closed down upon them",
        "in extended columns.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_fil",
    kind: "surah",
    title: { bn: "সূরা আল-ফীল", en: "Surah Al-Fil" },
    arabic: quran(ayat(105, 5)),
    pronunciation: [
      "আলাম তারা কাইফা ফা'আলা রাব্বুকা বিআসহা-বিল ফীল।",
      "আলাম ইয়াজ'আল কাইদাহুম ফী তাদলীল।",
      "ওয়া আরসালা 'আলাইহিম তাইরান আবা-বীল।",
      "তারমীহিম বিহিজা-রাতিম মিন সিজ্জীল।",
      "ফাজা'আলাহুম কা'আসফিম মা'কূল।",
    ].join("\n"),
    meaning: {
      bn: [
        "তুমি কি দেখোনি, তোমার প্রতিপালক হাতিওয়ালাদের সাথে কী করেছিলেন?",
        "তিনি কি তাদের চক্রান্ত ব্যর্থ করে দেননি?",
        "আর তিনি তাদের ওপর ঝাঁকে ঝাঁকে পাখি পাঠালেন,",
        "যারা তাদের ওপর পোড়া মাটির পাথর ছুড়ছিল।",
        "এরপর তিনি তাদের করে দিলেন চিবিয়ে ফেলা ভুসির মতো।",
      ],
      en: [
        "Have you not seen how your Lord dealt with the people of the elephant?",
        "Did He not make their plan go astray?",
        "He sent against them birds in flocks,",
        "pelting them with stones of baked clay,",
        "and He made them like chewed-up straw.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_quraysh",
    kind: "surah",
    title: { bn: "সূরা কুরাইশ", en: "Surah Quraysh" },
    arabic: quran(ayat(106, 4)),
    pronunciation: [
      "লিঈলা-ফি কুরাইশ।",
      "ঈলা-ফিহিম রিহলাতাশ শিতা-ই ওয়াস সাইফ।",
      "ফালইয়া'বুদূ রাব্বা হা-যাল বাইত।",
      "আল্লাযী আত'আমাহুম মিন জূ'ইঁও ওয়া আ-মানাহুম মিন খাওফ।",
    ].join("\n"),
    meaning: {
      bn: [
        "কুরাইশের নিরাপত্তা ও অভ্যস্ততার জন্য,",
        "শীত ও গ্রীষ্মের সফরে তাদের নিরাপত্তার জন্য,",
        "তারা যেন এই ঘরের প্রতিপালকের ইবাদত করে,",
        "যিনি তাদের ক্ষুধায় খাবার দিয়েছেন আর ভয় থেকে নিরাপদ রেখেছেন।",
      ],
      en: [
        "For the security of Quraysh,",
        "their security in the journeys of winter and summer,",
        "let them worship the Lord of this House,",
        "who fed them against hunger and made them safe from fear.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_maun",
    kind: "surah",
    title: { bn: "সূরা আল-মাউন", en: "Surah Al-Ma'un" },
    arabic: quran(ayat(107, 7)),
    pronunciation: [
      "আরাআইতাল্লাযী ইউকাযযিবু বিদ্দীন।",
      "ফাযা-লিকাল্লাযী ইয়াদু'উল ইয়াতীম।",
      "ওয়ালা ইয়াহুদ্দু 'আলা তা'আ-মিল মিসকীন।",
      "ফাওয়াইলুল লিল মুসাল্লীন।",
      "আল্লাযীনা হুম 'আন সালা-তিহিম সা-হূন।",
      "আল্লাযীনা হুম ইউরা-ঊন।",
      "ওয়া ইয়ামনা'ঊনাল মা-'ঊন।",
    ].join("\n"),
    meaning: {
      bn: [
        "তুমি কি তাকে দেখেছ, যে প্রতিদান দিবসকে অস্বীকার করে?",
        "সে-ই তো, যে এতিমকে রূঢ়ভাবে তাড়িয়ে দেয়,",
        "আর অভাবীকে খাবার দিতে উৎসাহ দেয় না।",
        "অতএব দুর্ভোগ সেই নামাজিদের,",
        "যারা নিজেদের নামাজ সম্পর্কে উদাসীন,",
        "যারা লোক দেখানোর জন্য কাজ করে,",
        "আর ছোটখাটো সাহায্যের জিনিসও দিতে বাধা দেয়।",
      ],
      en: [
        "Have you seen the one who denies the Judgement?",
        "That is the one who pushes away the orphan",
        "and does not encourage feeding the poor.",
        "So woe to those who pray",
        "but are heedless of their prayer,",
        "those who only show off",
        "and withhold small kindnesses.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_kawthar",
    kind: "surah",
    title: { bn: "সূরা আল-কাওসার", en: "Surah Al-Kawthar" },
    arabic: quran(ayat(108, 3)),
    pronunciation: ["ইন্না আ'তাইনা-কাল কাওসার।", "ফাসাল্লি লিরাব্বিকা ওয়ানহার।", "ইন্না শা-নি'আকা হুওয়াল আবতার।"].join("\n"),
    meaning: {
      bn: ["নিশ্চয়ই আমি তোমাকে কাওসার (অফুরন্ত কল্যাণ) দান করেছি।", "অতএব তোমার প্রতিপালকের জন্য নামাজ পড়ো এবং কোরবানি করো।", "নিশ্চয়ই তোমার শত্রুই শিকড়কাটা।"],
      en: ["We have given you Al-Kawthar, abundant good.", "So pray to your Lord and sacrifice.", "It is your enemy who is cut off."],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_nasr",
    kind: "surah",
    title: { bn: "সূরা আন-নাসর", en: "Surah An-Nasr" },
    arabic: quran(ayat(110, 3)),
    pronunciation: [
      "ইযা জা-আ নাসরুল্লা-হি ওয়াল ফাতহ।",
      "ওয়া রাআইতান না-সা ইয়াদখুলূনা ফী দীনিল্লা-হি আফওয়া-জা।",
      "ফাসাব্বিহ বিহামদি রাব্বিকা ওয়াসতাগফিরহ্‌, ইন্নাহূ কা-না তাওয়্যা-বা।",
    ].join("\n"),
    meaning: {
      bn: [
        "যখন আল্লাহর সাহায্য ও বিজয় আসবে,",
        "আর তুমি দেখবে, মানুষ দলে দলে আল্লাহর দ্বীনে প্রবেশ করছে,",
        "তখন তোমার প্রতিপালকের প্রশংসাসহ তাঁর পবিত্রতা ঘোষণা করো আর তাঁর কাছে ক্ষমা চাও; নিশ্চয়ই তিনি তওবা কবুলকারী।",
      ],
      en: [
        "When Allah's help comes, and the victory,",
        "and you see people entering Allah's religion in crowds,",
        "then glorify the praise of your Lord and ask His forgiveness. He is ever accepting of repentance.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_masad",
    kind: "surah",
    title: { bn: "সূরা আল-মাসাদ (লাহাব)", en: "Surah Al-Masad (Al-Lahab)" },
    arabic: quran(ayat(111, 5)),
    pronunciation: [
      "তাব্বাত ইয়াদা আবী লাহাবিঁও ওয়া তাব্ব।",
      "মা আগনা 'আনহু মা-লুহূ ওয়ামা কাসাব।",
      "সাইয়াসলা না-রান যা-তা লাহাব।",
      "ওয়ামরাআতুহূ হাম্মা-লাতাল হাতাব।",
      "ফী জীদিহা হাবলুম মিম মাসাদ।",
    ].join("\n"),
    meaning: {
      bn: [
        "আবু লাহাবের দুই হাত ধ্বংস হোক, আর সে নিজেও ধ্বংস হয়েছে।",
        "তার সম্পদ আর তার উপার্জন তার কোনো কাজে আসেনি।",
        "শীঘ্রই সে প্রবেশ করবে লেলিহান আগুনে,",
        "আর তার স্ত্রীও, যে লাকড়ি বয়ে বেড়াত।",
        "তার গলায় থাকবে পাকানো খেজুর-আঁশের রশি।",
      ],
      en: [
        "May the hands of Abu Lahab perish, and he has perished.",
        "His wealth did not avail him, nor what he earned.",
        "He will burn in a fire of blazing flame,",
        "and his wife too, the carrier of firewood,",
        "with a rope of twisted fibre around her neck.",
      ],
    },
    tags: ["book", "quran", "surah", "salah"],
  },
  {
    id: "surah_falaq",
    kind: "surah",
    title: { bn: "সূরা আল-ফালাক", en: "Surah Al-Falaq" },
    arabic: quran(ayat(113, 5)),
    pronunciation: [
      "কুল আ'ঊযু বিরাব্বিল ফালাক।",
      "মিন শাররি মা খালাক।",
      "ওয়া মিন শাররি গা-সিকিন ইযা ওয়াকাব।",
      "ওয়া মিন শাররিন নাফফা-সা-তি ফিল 'উকাদ।",
      "ওয়া মিন শাররি হা-সিদিন ইযা হাসাদ।",
    ].join("\n"),
    meaning: {
      bn: [
        "বলো: আমি আশ্রয় চাই ভোরের প্রতিপালকের কাছে,",
        "তিনি যা সৃষ্টি করেছেন তার অনিষ্ট থেকে,",
        "আর অন্ধকার রাতের অনিষ্ট থেকে, যখন তা ছেয়ে যায়,",
        "আর গিরায় ফুঁ দেওয়া জাদুকরদের অনিষ্ট থেকে,",
        "আর হিংসুকের অনিষ্ট থেকে, যখন সে হিংসা করে।",
      ],
      en: [
        "Say: I seek refuge with the Lord of daybreak",
        "from the evil of what He has created,",
        "from the evil of darkness when it settles,",
        "from the evil of those who blow on knots,",
        "and from the evil of an envier when he envies.",
      ],
    },
    tags: ["book", "quran", "surah", "salah", "daily"],
  },
  {
    id: "surah_nas",
    kind: "surah",
    title: { bn: "সূরা আন-নাস", en: "Surah An-Nas" },
    arabic: quran(ayat(114, 6)),
    pronunciation: [
      "কুল আ'ঊযু বিরাব্বিন না-স।",
      "মালিকিন না-স।",
      "ইলা-হিন না-স।",
      "মিন শাররিল ওয়াসওয়া-সিল খান্না-স।",
      "আল্লাযী ইউওয়াসউইসু ফী সুদূরিন না-স।",
      "মিনাল জিন্নাতি ওয়ান না-স।",
    ].join("\n"),
    meaning: {
      bn: [
        "বলো: আমি আশ্রয় চাই মানুষের প্রতিপালকের কাছে,",
        "মানুষের অধিপতির কাছে,",
        "মানুষের উপাস্যের কাছে,",
        "সেই কুমন্ত্রণাদাতার অনিষ্ট থেকে, যে কুমন্ত্রণা দিয়ে সরে পড়ে,",
        "যে মানুষের অন্তরে কুমন্ত্রণা দেয়,",
        "জিনদের মধ্য থেকে হোক বা মানুষের মধ্য থেকে।",
      ],
      en: [
        "Say: I seek refuge with the Lord of mankind,",
        "the King of mankind,",
        "the God of mankind,",
        "from the evil of the whisperer who withdraws,",
        "who whispers into the hearts of mankind,",
        "from among jinn and mankind.",
      ],
    },
    tags: ["book", "quran", "surah", "salah", "daily"],
  },
  {
    id: "basmalah",
    kind: "ayah",
    title: { bn: "বিসমিল্লাহ", en: "Bismillah" },
    arabic: quran(["1:1"]),
    pronunciation: "বিসমিল্লা-হির রাহমা-নির রাহীম।",
    meaning: { bn: ["পরম করুণাময়, পরম দয়ালু আল্লাহর নামে।"], en: ["In the name of Allah, the Most Compassionate, the Most Merciful."] },
    when: {
      bn: "নামাজে প্রতি রাকাতে সূরা ফাতিহার আগে আস্তে পড়বেন।",
      en: "Said quietly before Al-Fatihah in every rak'ah.",
    },
    tags: ["book", "salah"],
  },
];

/* ------------------------------------------------------- the prayer */

const PRAYER: SacredItem[] = [
  {
    id: "dua_takbir",
    kind: "dua",
    title: { bn: "তাকবির", en: "Takbir" },
    arabic: hadith("takbir"),
    pronunciation: "আল্লা-হু আকবার।",
    meaning: { bn: ["আল্লাহ সবচেয়ে বড়।"], en: ["Allah is the Greatest."] },
    when: {
      bn: "নামাজ শুরুর তাকবিরে তাহরিমায় এবং প্রতিটি রুকু-সিজদায় ওঠা-নামার সময়। তাওয়াফে হাজরে আসওয়াদের দিকে ইশারা করার সময়, আর জামারায় প্রতিটি কংকর ছোড়ার সময়ও এটি বলা হয়।",
      en: "At the opening of prayer and at every movement into and out of bowing and prostration. Also said when pointing to the Black Stone during tawaf, and with every pebble at the Jamarat.",
    },
    tags: ["book", "salah", "tawaf", "jamarat"],
  },
  {
    id: "dua_sana",
    kind: "dua",
    title: { bn: "সানা", en: "Opening supplication (Thana)" },
    arabic: hadith("sana"),
    pronunciation: "সুবহা-নাকা আল্লা-হুম্মা ওয়া বিহামদিকা, ওয়া তাবা-রাকাসমুকা, ওয়া তা'আ-লা জাদ্দুকা, ওয়া লা ইলা-হা গাইরুক।",
    meaning: {
      bn: ["হে আল্লাহ, তুমি পবিত্র, সব প্রশংসা তোমার; তোমার নাম বরকতময়, তোমার মর্যাদা অতি উচ্চ, আর তুমি ছাড়া কোনো উপাস্য নেই।"],
      en: ["Glory and praise be to You, O Allah. Blessed is Your name, exalted is Your majesty, and there is no god but You."],
    },
    when: { bn: "তাকবিরে তাহরিমার পর হাত বেঁধে প্রথম রাকাতে আস্তে পড়বেন।", en: "Said quietly in the first rak'ah, right after the opening takbir." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_taawwuz",
    kind: "dua",
    title: { bn: "আউযুবিল্লাহ", en: "Seeking refuge (Ta'awwudh)" },
    arabic: hadith("taawwuz"),
    pronunciation: "আ'ঊযু বিল্লা-হি মিনাশ শাইত্বা-নির রাজীম।",
    meaning: { bn: ["আমি বিতাড়িত শয়তান থেকে আল্লাহর আশ্রয় চাই।"], en: ["I seek refuge with Allah from Satan, the outcast."] },
    when: {
      bn: "নামাজে সানার পর সূরা ফাতিহার আগে, আর কুরআন পড়া শুরুর আগে। রাগ উঠলেও এটি বলতে বলা হয়েছে।",
      en: "In prayer after the opening supplication and before Al-Fatihah, and before reciting the Quran. It is also what to say when angry.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "dua_ruku",
    kind: "dua",
    title: { bn: "রুকুর তাসবিহ", en: "In bowing (ruku)" },
    arabic: hadith("ruku"),
    pronunciation: "সুবহা-না রাব্বিয়াল 'আযীম।",
    meaning: { bn: ["আমার মহান প্রতিপালক পবিত্র।"], en: ["Glory be to my Lord, the Magnificent."] },
    when: { bn: "রুকুতে কমপক্ষে তিনবার।", en: "In bowing, at least three times." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_tasmi",
    kind: "dua",
    title: { bn: "রুকু থেকে ওঠার সময়", en: "Rising from bowing" },
    arabic: hadith("tasmi"),
    pronunciation: "সামি'আল্লা-হু লিমান হামিদাহ্‌।",
    meaning: { bn: ["যে আল্লাহর প্রশংসা করে, আল্লাহ তার কথা শোনেন।"], en: ["Allah hears the one who praises Him."] },
    when: { bn: "রুকু থেকে মাথা তোলার সময়; ইমাম ও একা নামাজি বলবেন।", en: "While rising from bowing; said by the imam and by someone praying alone." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_tahmid",
    kind: "dua",
    title: { bn: "সোজা হয়ে দাঁড়িয়ে", en: "Standing after bowing" },
    arabic: hadith("tahmid"),
    pronunciation: "আল্লা-হুম্মা রাব্বানা লাকাল হামদ।",
    meaning: { bn: ["হে আল্লাহ, আমাদের প্রতিপালক, সব প্রশংসা তোমারই।"], en: ["O Allah, our Lord, to You belongs all praise."] },
    when: { bn: "রুকু থেকে সোজা হয়ে দাঁড়িয়ে; মুক্তাদি ও একা নামাজি বলবেন।", en: "Once standing upright after bowing; said by those behind the imam and by someone praying alone." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_sujud",
    kind: "dua",
    title: { bn: "সিজদার তাসবিহ", en: "In prostration (sujud)" },
    arabic: hadith("sujud"),
    pronunciation: "সুবহা-না রাব্বিয়াল আ'লা।",
    meaning: { bn: ["আমার সর্বোচ্চ প্রতিপালক পবিত্র।"], en: ["Glory be to my Lord, the Most High."] },
    when: { bn: "প্রতিটি সিজদায় কমপক্ষে তিনবার।", en: "In every prostration, at least three times." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_jalsa",
    kind: "dua",
    title: { bn: "দুই সিজদার মাঝে", en: "Between the two prostrations" },
    arabic: hadith("jalsa"),
    pronunciation: "আল্লা-হুম্মাগফিরলী, ওয়ারহামনী, ওয়া 'আ-ফিনী, ওয়াহদিনী, ওয়ারযুকনী।",
    meaning: {
      bn: ["হে আল্লাহ, আমাকে ক্ষমা করো, আমার প্রতি দয়া করো, আমাকে সুস্থ রাখো, আমাকে পথ দেখাও আর আমাকে রিজিক দাও।"],
      en: ["O Allah, forgive me, have mercy on me, keep me well, guide me and provide for me."],
    },
    when: { bn: "দুই সিজদার মাঝে সোজা হয়ে বসে।", en: "Sitting upright between the two prostrations." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_tashahhud",
    kind: "dua",
    title: { bn: "তাশাহহুদ (আত্তাহিয়্যাতু)", en: "Tashahhud (At-Tahiyyat)" },
    arabic: hadith("tashahhud"),
    pronunciation:
      "আত্তাহিয়্যা-তু লিল্লা-হি ওয়াস সালাওয়া-তু ওয়াত তাইয়্যিবা-তু, আসসালা-মু 'আলাইকা আইয়্যুহান নাবিয়্যু ওয়া রাহমাতুল্লা-হি ওয়া বারাকা-তুহ্‌, আসসালা-মু 'আলাইনা ওয়া 'আলা 'ইবা-দিল্লা-হিস সা-লিহীন, আশহাদু আল লা ইলা-হা ইল্লাল্লা-হু ওয়া আশহাদু আন্না মুহাম্মাদান 'আবদুহূ ওয়া রাসূলুহ্‌।",
    meaning: {
      bn: [
        "সব সম্মান, সব নামাজ ও সব পবিত্র কথা আল্লাহর জন্য। হে নবী, আপনার ওপর সালাম এবং আল্লাহর রহমত ও বরকত। আমাদের ওপর আর আল্লাহর নেক বান্দাদের ওপর সালাম। আমি সাক্ষ্য দিচ্ছি যে আল্লাহ ছাড়া কোনো উপাস্য নেই, আর সাক্ষ্য দিচ্ছি যে মুহাম্মাদ তাঁর বান্দা ও রাসূল।",
      ],
      en: [
        "All greetings, prayers and pure words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.",
      ],
    },
    when: { bn: "প্রতি দুই রাকাত পরের বৈঠকে এবং শেষ বৈঠকে।", en: "In the sitting after every two rak'ahs and in the final sitting." },
    note: {
      bn: "এটি আবদুল্লাহ ইবনে মাসউদ (রা.)-এর বর্ণনার তাশাহহুদ, হানাফি মাযহাবে এটিই পড়া হয়।",
      en: "This is the tashahhud narrated by Abdullah ibn Mas'ud, the one recited in the Hanafi school.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "dua_durud",
    kind: "dua",
    title: { bn: "দরুদ শরিফ (দরুদে ইবরাহিম)", en: "Salawat (Durud Ibrahim)" },
    arabic: hadith("durud"),
    pronunciation:
      "আল্লা-হুম্মা সাল্লি 'আলা মুহাম্মাদিঁও ওয়া 'আলা আ-লি মুহাম্মাদ, কামা সাল্লাইতা 'আলা ইবরা-হীমা ওয়া 'আলা আ-লি ইবরা-হীম, ইন্নাকা হামীদুম মাজীদ। আল্লা-হুম্মা বা-রিক 'আলা মুহাম্মাদিঁও ওয়া 'আলা আ-লি মুহাম্মাদ, কামা বা-রাকতা 'আলা ইবরা-হীমা ওয়া 'আলা আ-লি ইবরা-হীম, ইন্নাকা হামীদুম মাজীদ।",
    meaning: {
      bn: [
        "হে আল্লাহ, মুহাম্মাদ ও মুহাম্মাদের পরিবারের ওপর রহমত বর্ষণ করো, যেমন তুমি ইবরাহিম ও ইবরাহিমের পরিবারের ওপর রহমত বর্ষণ করেছ; নিশ্চয়ই তুমি প্রশংসিত, মহিমান্বিত। হে আল্লাহ, মুহাম্মাদ ও মুহাম্মাদের পরিবারের ওপর বরকত দাও, যেমন তুমি ইবরাহিম ও ইবরাহিমের পরিবারের ওপর বরকত দিয়েছ; নিশ্চয়ই তুমি প্রশংসিত, মহিমান্বিত।",
      ],
      en: [
        "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious.",
      ],
    },
    when: { bn: "শেষ বৈঠকে তাশাহহুদের পর।", en: "In the final sitting, after the tashahhud." },
    tags: ["book", "salah", "madinah"],
  },
  {
    id: "dua_masura",
    kind: "dua",
    title: { bn: "দোয়া মাসুরা", en: "Dua before the salam (Du'a Ma'thura)" },
    arabic: hadith("masura"),
    pronunciation:
      "আল্লা-হুম্মা ইন্নী যালামতু নাফসী যুলমান কাসীরা, ওয়ালা ইয়াগফিরুয যুনূবা ইল্লা আনতা, ফাগফিরলী মাগফিরাতাম মিন 'ইনদিকা, ওয়ারহামনী, ইন্নাকা আনতাল গাফূরুর রাহীম।",
    meaning: {
      bn: [
        "হে আল্লাহ, আমি নিজের ওপর অনেক জুলুম করেছি, আর তুমি ছাড়া কেউ গুনাহ মাফ করতে পারে না। তাই তোমার পক্ষ থেকে আমাকে ক্ষমা করো এবং আমার প্রতি দয়া করো; নিশ্চয়ই তুমি অতি ক্ষমাশীল, পরম দয়ালু।",
      ],
      en: [
        "O Allah, I have wronged myself greatly, and none forgives sins but You. So forgive me with forgiveness from You, and have mercy on me. You are the Forgiving, the Merciful.",
      ],
    },
    when: { bn: "শেষ বৈঠকে দরুদের পর, সালাম ফেরানোর আগে।", en: "In the final sitting, after the salawat and before the salam." },
    note: {
      bn: "আবু বকর (রা.) নামাজে পড়ার মতো একটি দোয়া শিখতে চাইলে নবী (সা.) এটি শিখিয়েছিলেন।",
      en: "Taught by the Prophet when Abu Bakr asked for a dua to say in his prayer.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "dua_salam",
    kind: "dua",
    title: { bn: "সালাম ফেরানো", en: "Closing salam" },
    arabic: hadith("salam"),
    pronunciation: "আসসালা-মু 'আলাইকুম ওয়া রাহমাতুল্লা-হ্‌।",
    meaning: { bn: ["তোমাদের ওপর শান্তি ও আল্লাহর রহমত বর্ষিত হোক।"], en: ["Peace be upon you, and the mercy of Allah."] },
    when: { bn: "নামাজ শেষে প্রথমে ডান দিকে, তারপর বাম দিকে মুখ ফিরিয়ে।", en: "To end the prayer, turning the face first to the right, then to the left." },
    tags: ["book", "salah"],
  },
  {
    id: "dua_qunut",
    kind: "dua",
    title: { bn: "দোয়া কুনুত (বিতর)", en: "Qunut in Witr" },
    arabic: hadith("qunut"),
    pronunciation:
      "আল্লা-হুম্মাহদিনী ফীমান হাদাইত, ওয়া 'আ-ফিনী ফীমান 'আ-ফাইত, ওয়া তাওয়াল্লানী ফীমান তাওয়াল্লাইত, ওয়া বা-রিক লী ফীমা আ'তাইত, ওয়া কিনী শাররা মা কাদাইত, ইন্নাকা তাকদী ওয়ালা ইউকদা 'আলাইক, ওয়া ইন্নাহূ লা ইয়াযিল্লু মাওঁ ওয়া-লাইত, ওয়ালা ইয়া'ইযযু মান 'আ-দাইত, তাবা-রাকতা রাব্বানা ওয়া তা'আ-লাইত।",
    meaning: {
      bn: [
        "হে আল্লাহ, তুমি যাদের পথ দেখিয়েছ, আমাকেও তাদের সাথে পথ দেখাও; যাদের নিরাপদ রেখেছ, আমাকেও তাদের সাথে নিরাপদ রাখো; যাদের অভিভাবক হয়েছ, আমারও অভিভাবক হও; যা দিয়েছ তাতে আমাকে বরকত দাও; আর যা ফয়সালা করেছ তার অনিষ্ট থেকে আমাকে রক্ষা করো। তুমিই ফয়সালা করো, তোমার ওপর কেউ ফয়সালা করতে পারে না। তুমি যার বন্ধু হও সে অপমানিত হয় না, আর যার শত্রু হও সে সম্মানিত হয় না। হে আমাদের প্রতিপালক, তুমি বরকতময়, তুমি সুমহান।",
      ],
      en: [
        "O Allah, guide me among those You have guided, keep me well among those You have kept well, befriend me among those You have befriended, bless me in what You have given, and protect me from the evil of what You have decreed. You decree and none decrees over You. Whoever You befriend is never humbled, and whoever You oppose is never honoured. Blessed are You, our Lord, and exalted.",
      ],
    },
    when: {
      bn: "বিতরের তৃতীয় রাকাতে কিরাতের পর রুকুর আগে, তাকবির বলে হাত বেঁধে।",
      en: "In the third rak'ah of Witr, after the recitation and before bowing, after a takbir.",
    },
    note: {
      bn: "নবী (সা.) হাসান ইবনে আলী (রা.)-কে বিতরে পড়ার জন্য এই দোয়া শিখিয়েছিলেন। হানাফি মাযহাবে বাংলাদেশে সাধারণত 'আল্লাহুম্মা ইন্না নাসতা'ঈনুকা…' দোয়াটি পড়া হয়, যা উমর (রা.)-এর আমল থেকে বর্ণিত; এই বইয়ের আরবি শুধু যাচাই করা হাদিস-সংকলন থেকে নেওয়া হয় বলে সেটি এখানে নেই। দুটির যেকোনোটি পড়া যায়।",
      en: "The Prophet taught this dua to al-Hasan ibn Ali for Witr. In the Hanafi practice common in Bangladesh, 'Allahumma inna nasta'inuka…', narrated from the practice of Umar, is usually recited; it is not shown here because this book takes Arabic only from verified hadith collections. Either may be recited.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "dua_after_salah",
    kind: "dua",
    title: { bn: "ফরজ নামাজের পর", en: "After the obligatory prayer" },
    arabic: hadith("after_salah"),
    pronunciation: "আল্লা-হুম্মা আনতাস সালা-মু ওয়া মিনকাস সালা-ম, তাবা-রাকতা যাল জালা-লি ওয়াল ইকরা-ম।",
    meaning: {
      bn: ["হে আল্লাহ, তুমিই শান্তি, আর তোমার কাছ থেকেই শান্তি; হে মহিমা ও সম্মানের অধিকারী, তুমি বরকতময়।"],
      en: ["O Allah, You are Peace and from You is peace. Blessed are You, Possessor of majesty and honour."],
    },
    when: {
      bn: "সালাম ফেরানোর পর তিনবার 'আস্তাগফিরুল্লাহ' (আমি আল্লাহর কাছে ক্ষমা চাই) বলে এটি পড়বেন।",
      en: "After the salam, say 'Astaghfirullah' (I ask Allah's forgiveness) three times, then this.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "hadith_tasbih",
    kind: "hadith",
    title: { bn: "নামাজের পর তাসবিহ", en: "Glorification after prayer" },
    arabic: hadith("tasbih_fatimah"),
    pronunciation:
      "মান সাব্বাহাল্লা-হা ফী দুবুরি কুল্লি সালা-তিন সালা-সান ওয়া সালা-সীনা, ওয়া হামিদাল্লা-হা সালা-সান ওয়া সালা-সীনা, ওয়া কাব্বারাল্লা-হা সালা-সান ওয়া সালা-সীনা, ফাতিলকা তিস'আতুঁও ওয়া তিস'ঊন, ওয়া কা-লা তামা-মাল মি-আহ্‌: লা ইলা-হা ইল্লাল্লা-হু ওয়াহদাহূ লা শারীকা লাহূ, লাহুল মুলকু ওয়া লাহুল হামদু ওয়া হুওয়া 'আলা কুল্লি শাইয়িন কাদীর, গুফিরাত খাতা-ইয়া-হু ওয়া ইন কা-নাত মিসলা যাবাদিল বাহর।",
    meaning: {
      bn: [
        "যে প্রতি নামাজের পর তেত্রিশবার সুবহানাল্লাহ, তেত্রিশবার আলহামদুলিল্লাহ ও তেত্রিশবার আল্লাহু আকবার বলে, তাতে নিরানব্বই হয়, আর একশ পূর্ণ করতে বলে 'লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারিকা লাহু, লাহুল মুলকু ওয়া লাহুল হামদু ওয়া হুওয়া আলা কুল্লি শাইয়িন কাদির', তার গুনাহ মাফ করা হয়, যদিও তা সাগরের ফেনার মতো হয়।",
      ],
      en: [
        "Whoever glorifies Allah thirty-three times after every prayer, praises Him thirty-three times and magnifies Him thirty-three times, making ninety-nine, and completes the hundred with 'There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things', his sins are forgiven, even if they are like the foam of the sea.",
      ],
    },
    when: {
      bn: "প্রতি ফরজ নামাজের পর: সুবহানাল্লাহ ৩৩ বার, আলহামদুলিল্লাহ ৩৩ বার, আল্লাহু আকবার ৩৩ বার।",
      en: "After every obligatory prayer: Subhanallah 33 times, Alhamdulillah 33 times, Allahu akbar 33 times.",
    },
    tags: ["book", "salah"],
  },
  {
    id: "dua_adhan",
    kind: "dua",
    title: { bn: "আজানের পর দোয়া", en: "After the call to prayer" },
    arabic: hadith("adhan_dua"),
    pronunciation:
      "আল্লা-হুম্মা রাব্বা হা-যিহিদ দা'ওয়াতিত তা-ম্মাহ্‌, ওয়াস সালা-তিল কা-ইমাহ্‌, আ-তি মুহাম্মাদানিল ওয়াসীলাতা ওয়াল ফাদীলাহ্‌, ওয়াব'আসহু মাকা-মাম মাহমূদানিল্লাযী ওয়া'আদতাহ্‌।",
    meaning: {
      bn: ["হে আল্লাহ, এই পূর্ণাঙ্গ আহ্বান ও প্রতিষ্ঠিত হতে যাওয়া নামাজের প্রতিপালক, মুহাম্মাদ (সা.)-কে ওয়াসিলা ও শ্রেষ্ঠত্ব দান করো, আর তাঁকে সেই প্রশংসিত মর্যাদায় পৌঁছে দাও, যার প্রতিশ্রুতি তুমি তাঁকে দিয়েছ।"],
      en: ["O Allah, Lord of this complete call and of the prayer about to be established, grant Muhammad the Wasilah and excellence, and raise him to the praised station You have promised him."],
    },
    when: { bn: "আজান শেষ হওয়ার পর।", en: "When the call to prayer ends." },
    tags: ["book", "salah", "daily"],
  },
  {
    id: "dua_wudu_after",
    kind: "dua",
    title: { bn: "ওজুর পর দোয়া", en: "After wudu" },
    arabic: hadith("wudu_after"),
    pronunciation: "আশহাদু আল লা ইলা-হা ইল্লাল্লা-হু ওয়াহদাহূ লা শারীকা লাহূ, ওয়া আশহাদু আন্না মুহাম্মাদান 'আবদুহূ ওয়া রাসূলুহ্‌।",
    meaning: {
      bn: ["আমি সাক্ষ্য দিচ্ছি, আল্লাহ ছাড়া কোনো উপাস্য নেই, তিনি এক, তাঁর কোনো শরিক নেই; আর সাক্ষ্য দিচ্ছি, মুহাম্মাদ তাঁর বান্দা ও রাসূল।"],
      en: ["I bear witness that there is no god but Allah alone, without partner, and I bear witness that Muhammad is His servant and messenger."],
    },
    when: { bn: "ওজু শেষ করে।", en: "On finishing wudu." },
    note: {
      bn: "হাদিসে আছে, যে ভালোভাবে ওজু করে এটি বলে, তার জন্য জান্নাতের আটটি দরজাই খুলে দেওয়া হয়।",
      en: "The hadith says that for whoever performs wudu well and says this, all eight gates of Paradise are opened.",
    },
    tags: ["book", "salah", "wudu"],
  },
  {
    id: "dua_wudu_after_extra",
    kind: "dua",
    title: { bn: "ওজুর পর (তিরমিযির বর্ণনায় অতিরিক্ত)", en: "After wudu (addition in Tirmidhi)" },
    arabic: hadith("wudu_after_extra"),
    pronunciation: "আল্লা-হুম্মাজ'আলনী মিনাত তাওয়্যা-বীনা ওয়াজ'আলনী মিনাল মুতাতাহহিরীন।",
    meaning: {
      bn: ["হে আল্লাহ, আমাকে তওবাকারীদের অন্তর্ভুক্ত করো এবং পবিত্রতা অর্জনকারীদের অন্তর্ভুক্ত করো।"],
      en: ["O Allah, make me one of those who repent and one of those who purify themselves."],
    },
    when: { bn: "আগের দোয়ার পর।", en: "After the dua above." },
    tags: ["book", "salah", "wudu"],
  },
  {
    id: "hadith_ayatul_kursi",
    kind: "hadith",
    title: { bn: "ঘুমের আগে আয়াতুল কুরসি", en: "Ayat al-Kursi before sleep" },
    arabic: hadith("ayatul_kursi_virtue"),
    pronunciation: "ইযা আওয়াইতা ইলা ফিরা-শিকা ফাকরা' আ-য়াতাল কুরসিয়্যি, লান ইয়াযা-লা মা'আকা মিনাল্লা-হি হা-ফিযুঁও ওয়ালা ইয়াকরাবুকা শাইত্বা-নুন হাত্তা তুসবিহ।",
    meaning: {
      bn: ["যখন বিছানায় যাবে, আয়াতুল কুরসি পড়বে; তাহলে সকাল পর্যন্ত আল্লাহর পক্ষ থেকে একজন রক্ষক তোমার সাথে থাকবেন, আর শয়তান তোমার কাছে আসবে না।"],
      en: ["When you go to bed, recite Ayat al-Kursi; a guardian from Allah will stay with you and no devil will come near you until morning."],
    },
    tags: ["book", "daily"],
  },
];

/* -------------------------------------------------------- every day */

const DAILY: SacredItem[] = [
  {
    id: "dua_eat_start",
    kind: "dua",
    title: { bn: "খাওয়ার শুরুতে", en: "Before eating" },
    arabic: hadith("eat_start"),
    pronunciation: "বিসমিল্লা-হ্‌।",
    meaning: { bn: ["আল্লাহর নামে।"], en: ["In the name of Allah."] },
    when: { bn: "খাওয়া শুরু করার সময়, ডান হাতে।", en: "When starting to eat, with the right hand." },
    tags: ["book", "daily"],
  },
  {
    id: "dua_eat_forgot",
    kind: "dua",
    title: { bn: "শুরুতে বিসমিল্লাহ ভুলে গেলে", en: "If you forgot to say Bismillah" },
    arabic: hadith("eat_forgot"),
    pronunciation: "বিসমিল্লা-হি আওয়ালাহূ ওয়া আ-খিরাহ্‌।",
    meaning: { bn: ["এর শুরুতে ও শেষে আল্লাহর নামে।"], en: ["In the name of Allah, at its beginning and its end."] },
    when: { bn: "খাওয়ার মাঝখানে মনে পড়লে।", en: "When you remember during the meal." },
    tags: ["book", "daily"],
  },
  {
    id: "dua_eat_end",
    kind: "dua",
    title: { bn: "খাওয়ার পরে", en: "After eating" },
    arabic: hadith("eat_end"),
    pronunciation: "আলহামদু লিল্লা-হিল্লাযী আত'আমানী হা-যাত তা'আ-মা ওয়া রাযাকানীহি মিন গাইরি হাওলিম মিন্নী ওয়ালা কুওয়্যাহ্‌।",
    meaning: {
      bn: ["সব প্রশংসা আল্লাহর, যিনি আমাকে এই খাবার খাইয়েছেন এবং আমার কোনো শক্তি ও সামর্থ্য ছাড়াই আমাকে তা দিয়েছেন।"],
      en: ["Praise be to Allah who fed me this food and provided it for me without any power or strength of my own."],
    },
    note: { bn: "হাদিসে আছে, এটি বললে আগের গুনাহ মাফ করা হয়।", en: "The hadith says that past sins are forgiven for whoever says this." },
    tags: ["book", "daily"],
  },
  {
    id: "dua_sleep",
    kind: "dua",
    title: { bn: "ঘুমানোর আগে", en: "Before sleeping" },
    arabic: hadith("sleep"),
    pronunciation: "বিসমিকা আল্লা-হুম্মা আমূতু ওয়া আহইয়া।",
    meaning: { bn: ["হে আল্লাহ, তোমার নামেই আমি মরি ও বাঁচি।"], en: ["In Your name, O Allah, I die and I live."] },
    tags: ["book", "daily"],
  },
  {
    id: "dua_wake",
    kind: "dua",
    title: { bn: "ঘুম থেকে উঠে", en: "On waking" },
    arabic: hadith("wake"),
    pronunciation: "আলহামদু লিল্লা-হিল্লাযী আহইয়া-না বা'দা মা আমা-তানা ওয়া ইলাইহিন নুশূর।",
    meaning: {
      bn: ["সব প্রশংসা আল্লাহর, যিনি আমাদের মৃত্যুর (ঘুমের) পর জীবিত করেছেন, আর তাঁর কাছেই আমাদের ফিরে যেতে হবে।"],
      en: ["Praise be to Allah who gave us life after He had caused us to die, and to Him is the rising."],
    },
    tags: ["book", "daily"],
  },
  {
    id: "dua_home_leave",
    kind: "dua",
    title: { bn: "ঘর থেকে বের হওয়ার সময়", en: "Leaving home" },
    arabic: hadith("home_leave"),
    pronunciation: "বিসমিল্লা-হি তাওয়াক্কালতু 'আলাল্লা-হি, লা হাওলা ওয়ালা কুওয়্যাতা ইল্লা বিল্লা-হ্‌।",
    meaning: {
      bn: ["আল্লাহর নামে (বের হলাম), আল্লাহর ওপর ভরসা করলাম; আল্লাহর সাহায্য ছাড়া কোনো শক্তি ও সামর্থ্য নেই।"],
      en: ["In the name of Allah; I rely on Allah. There is no power and no strength except through Allah."],
    },
    tags: ["book", "daily", "travel"],
  },
  {
    id: "dua_toilet_enter",
    kind: "dua",
    title: { bn: "টয়লেটে প্রবেশের আগে", en: "Before entering the toilet" },
    arabic: hadith("toilet_enter"),
    pronunciation: "আল্লা-হুম্মা ইন্নী আ'ঊযু বিকা মিনাল খুবুসি ওয়াল খাবা-ইস।",
    meaning: { bn: ["হে আল্লাহ, আমি তোমার কাছে আশ্রয় চাই পুরুষ ও নারী শয়তানের অনিষ্ট থেকে।"], en: ["O Allah, I seek refuge with You from the male and female devils."] },
    when: { bn: "প্রবেশের আগে বাম পা দিয়ে ঢোকার সময়।", en: "Before going in, entering with the left foot." },
    tags: ["book", "daily"],
  },
  {
    id: "dua_toilet_exit",
    kind: "dua",
    title: { bn: "টয়লেট থেকে বের হয়ে", en: "On leaving the toilet" },
    arabic: hadith("toilet_exit"),
    pronunciation: "গুফরা-নাক।",
    meaning: { bn: ["(হে আল্লাহ) তোমার ক্ষমা চাই।"], en: ["(O Allah) I ask Your forgiveness."] },
    when: { bn: "ডান পা দিয়ে বের হয়ে।", en: "On stepping out with the right foot." },
    tags: ["book", "daily"],
  },
];

/* ------------------------------------------- Umrah, Hajj and Madinah */

const RITES: SacredItem[] = [
  {
    id: "dua_maqam",
    kind: "ayah",
    title: { bn: "মাকামে ইবরাহিমে", en: "At Maqam Ibrahim" },
    arabic: hadith("maqam"),
    pronunciation: "ওয়াত্তাখিযূ মিম মাকা-মি ইবরা-হীমা মুসাল্লা।",
    meaning: { bn: ["আর তোমরা মাকামে ইবরাহিমকে নামাজের স্থান বানাও।"], en: ["And take the station of Ibrahim as a place of prayer."] },
    when: {
      bn: "তাওয়াফ শেষে মাকামে ইবরাহিমের দিকে যেতে যেতে, এরপর সেখানে দুই রাকাত নামাজ।",
      en: "While walking to Maqam Ibrahim after tawaf, before praying two rak'ahs there.",
    },
    note: {
      bn: "এটি সূরা বাকারার ১২৫ নম্বর আয়াতের অংশ; জাবির (রা.) বর্ণনা করেছেন, নবী (সা.) তাওয়াফের পর এটি তিলাওয়াত করে মাকামে ইবরাহিমের দিকে গিয়েছিলেন।",
      en: "Part of Al-Baqarah 2:125; Jabir narrates that the Prophet recited it after tawaf as he went to Maqam Ibrahim.",
    },
    tags: ["book", "umrah", "hajj", "tawaf"],
  },
  {
    id: "hadith_zamzam",
    kind: "hadith",
    title: { bn: "জমজমের পানি", en: "Zamzam water" },
    arabic: hadith("zamzam"),
    pronunciation: "মা-উ যামযামা লিমা শুরিবা লাহ্‌।",
    meaning: { bn: ["জমজমের পানি সেই উদ্দেশ্যেই, যে উদ্দেশ্যে তা পান করা হয়।"], en: ["Zamzam water is for whatever it is drunk for."] },
    when: {
      bn: "জমজম পান করার সময় কিবলামুখী হয়ে, বিসমিল্লাহ বলে, তিন নিঃশ্বাসে পান করবেন এবং নিজের প্রয়োজনের জন্য দোয়া করবেন।",
      en: "When drinking Zamzam: face the qiblah, say Bismillah, drink in three breaths, and ask Allah for what you need.",
    },
    note: {
      bn: "এর সনদ নিয়ে মুহাদ্দিসদের মধ্যে আলোচনা আছে; অনেকে একে হাসান বা সহিহ বলেছেন।",
      en: "Scholars of hadith have discussed its chain; many graded it hasan or sahih.",
    },
    tags: ["book", "umrah", "hajj"],
  },
  {
    id: "dua_sacrifice",
    kind: "dua",
    title: { bn: "কোরবানির সময়", en: "At the sacrifice" },
    arabic: hadith("sacrifice"),
    pronunciation: "বিসমিল্লা-হি ওয়াল্লা-হু আকবার।",
    meaning: { bn: ["আল্লাহর নামে, আর আল্লাহ সবচেয়ে বড়।"], en: ["In the name of Allah, and Allah is the Greatest."] },
    when: { bn: "১০ জিলহজ বা পরের দিনগুলোতে পশু জবাই করার সময়।", en: "When slaughtering the animal, on the 10th of Dhul Hijjah or the days after." },
    tags: ["book", "hajj"],
  },
  {
    id: "hadith_halq",
    kind: "hadith",
    title: { bn: "মাথা মুণ্ডনকারীদের জন্য নবীর দোয়া", en: "The Prophet's dua for those who shave" },
    arabic: hadith("halq"),
    pronunciation: "আল্লা-হুম্মারহামিল মুহাল্লিকীন।",
    meaning: { bn: ["হে আল্লাহ, যারা মাথা মুণ্ডন করেছে তাদের প্রতি রহম করো।"], en: ["O Allah, have mercy on those who shave their heads."] },
    note: {
      bn: "নবী (সা.) এটি একাধিকবার বলার পর যারা চুল ছোট করে তাদের জন্যও দোয়া করেছেন; তাই পুরুষের জন্য মাথা মুণ্ডন উত্তম, তবে চুল ছোট করাও যথেষ্ট।",
      en: "The Prophet said this more than once and then prayed for those who shorten their hair as well: shaving is better for men, and shortening is enough.",
    },
    tags: ["book", "umrah", "hajj"],
  },
  {
    id: "dua_salam_prophet",
    kind: "dua",
    title: { bn: "রওজা মোবারকে সালাম", en: "Greeting the Prophet at his grave" },
    arabic: hadith("salam_prophet"),
    pronunciation: "আসসালা-মু 'আলাইকা আইয়্যুহান নাবিয়্যু ওয়া রাহমাতুল্লা-হি ওয়া বারাকা-তুহ্‌।",
    meaning: { bn: ["হে নবী, আপনার ওপর সালাম এবং আল্লাহর রহমত ও বরকত।"], en: ["Peace be upon you, O Prophet, and the mercy of Allah and His blessings."] },
    when: {
      bn: "মসজিদে নববীতে রওজা মোবারকের সামনে আদবের সাথে, নিচু স্বরে। এরপর আবু বকর (রা.) ও উমর (রা.)-কে সালাম দেবেন।",
      en: "At the Prophet's grave in his mosque, with respect and in a low voice. Then greet Abu Bakr and Umar.",
    },
    note: {
      bn: "আরবি পাঠটি তাশাহহুদের সালাম থেকে নেওয়া। রওজায় সালাম দেওয়ার আমল আবদুল্লাহ ইবনে উমর (রা.) থেকে মুয়াত্তা মালিকে বর্ণিত।",
      en: "The Arabic is the greeting from the tashahhud. Greeting the Prophet at his grave is narrated from the practice of Abdullah ibn Umar in the Muwatta of Malik.",
    },
    tags: ["book", "madinah"],
  },
  {
    id: "dua_baqi",
    kind: "dua",
    title: { bn: "কবর জিয়ারতের দোয়া (জান্নাতুল বাকি)", en: "Visiting the graves (al-Baqi)" },
    arabic: hadith("baqi"),
    pronunciation:
      "আসসালা-মু 'আলাইকুম আহলাদ দিয়া-রি মিনাল মু'মিনীনা ওয়াল মুসলিমীন, ওয়া ইন্না ইন শা-আল্লা-হু লালা-হিকূন, আস'আলুল্লা-হা লানা ওয়ালাকুমুল 'আ-ফিয়াহ্‌।",
    meaning: {
      bn: ["হে এই আবাসের মুমিন ও মুসলিম বাসিন্দারা, তোমাদের ওপর শান্তি বর্ষিত হোক। আল্লাহ চাইলে আমরাও তোমাদের সাথে মিলিত হব। আমি আল্লাহর কাছে আমাদের ও তোমাদের জন্য নিরাপত্তা চাই।"],
      en: ["Peace be upon you, believing and Muslim people of these dwellings. We will join you, if Allah wills. I ask Allah for well-being for us and for you."],
    },
    when: { bn: "জান্নাতুল বাকি বা যেকোনো কবরস্থানে গেলে।", en: "When visiting al-Baqi or any graveyard." },
    tags: ["book", "madinah"],
  },
];

/* ------------------------------------------------- kalimah and salawat */

const KALIMAH: SacredItem[] = [
  {
    id: "kalima_tayyibah",
    kind: "ayah",
    title: { bn: "প্রথম কালিমা: কালিমা তাইয়্যিবা", en: "The first kalimah: Kalimah Tayyibah" },
    arabic: quranParts(["tayyibah_tawhid", "tayyibah_risalah"]),
    pronunciation: ["লা ইলা-হা ইল্লাল্লা-হু", "মুহাম্মাদুর রাসূলুল্লা-হ্‌"].join("\n"),
    meaning: {
      bn: ["আল্লাহ ছাড়া কোনো উপাস্য নেই,", "মুহাম্মাদ আল্লাহর রাসূল।"],
      en: ["There is no god but Allah;", "Muhammad is the Messenger of Allah."],
    },
    note: {
      bn: "ঈমানের মূল কথা। দুই অংশই কুরআন থেকে হুবহু নেওয়া: প্রথম অংশ সূরা মুহাম্মাদ ৪৭:১৯, দ্বিতীয় অংশ সূরা আল-ফাতহ ৪৮:২৯। দ্বিতীয় অংশের শুরুর মীমে তাশদিদ আয়াতের আগের শব্দের সাথে মিলিয়ে পড়ার চিহ্ন; কালিমা হিসেবে পড়ার সময় \"মুহাম্মাদুর রাসূলুল্লাহ\" পড়ুন। নবী (সা.) বলেছেন, সর্বোত্তম জিকির \"লা ইলাহা ইল্লাল্লাহ\" (তিরমিযী ৩৩৮৩, হাসান)।",
      en: "The heart of faith. Both halves are taken word for word from the Quran: the first from Surah Muhammad 47:19, the second from Surah Al-Fath 48:29. The shaddah on the first mim of the second half joins it to the end of the previous ayah; as a kalimah it is read \"Muhammadur Rasulullah\". The Prophet said the best remembrance is \"La ilaha illallah\" (Tirmidhi 3383, hasan).",
    },
    tags: ["book", "kalimah"],
  },
  {
    id: "kalima_shahadah",
    kind: "dua",
    title: { bn: "দ্বিতীয় কালিমা: কালিমা শাহাদাত", en: "The second kalimah: Kalimah Shahadah" },
    arabic: hadith("wudu_after"),
    pronunciation: "আশহাদু আল লা ইলা-হা ইল্লাল্লা-হু ওয়াহদাহূ লা শারীকা লাহূ, ওয়া আশহাদু আন্না মুহাম্মাদান 'আবদুহূ ওয়া রাসূলুহ্‌।",
    meaning: {
      bn: ["আমি সাক্ষ্য দিচ্ছি, আল্লাহ ছাড়া কোনো উপাস্য নেই, তিনি এক, তাঁর কোনো শরিক নেই; আর সাক্ষ্য দিচ্ছি, মুহাম্মাদ তাঁর বান্দা ও রাসূল।"],
      en: ["I bear witness that there is no god but Allah alone, without partner, and I bear witness that Muhammad is His servant and messenger."],
    },
    note: {
      bn: "এই শব্দে সাক্ষ্যটি নবী (সা.) ওজুর পর পড়তে শিখিয়েছেন; যে ভালোভাবে ওজু করে এটি পড়ে, তার জন্য জান্নাতের আটটি দরজা খুলে দেওয়া হয়।",
      en: "In these words the Prophet taught this testimony to be said after wudu; for whoever performs wudu well and says it, the eight gates of Paradise are opened.",
    },
    tags: ["book", "kalimah"],
  },
  {
    id: "kalima_tamjid",
    kind: "dua",
    title: { bn: "তৃতীয় কালিমা: কালিমা তামজিদ", en: "The third kalimah: Kalimah Tamjid" },
    arabic: hadith("tamjid"),
    pronunciation:
      "সুবহা-নাল্লা-হি ওয়াল হামদু লিল্লা-হি ওয়া লা ইলা-হা ইল্লাল্লা-হু ওয়াল্লা-হু আকবার, ওয়া লা হাওলা ওয়া লা কুওয়্যাতা ইল্লা বিল্লা-হিল 'আলিয়্যিল 'আযীম।",
    meaning: {
      bn: ["আল্লাহ পবিত্র, সব প্রশংসা আল্লাহর, আল্লাহ ছাড়া কোনো উপাস্য নেই, আল্লাহ সবচেয়ে বড়; সর্বোচ্চ, মহান আল্লাহর সাহায্য ছাড়া পাপ থেকে বাঁচার ক্ষমতা আর ভালো কাজের শক্তি নেই।"],
      en: ["Glory be to Allah, all praise is Allah's, there is no god but Allah, Allah is the Greatest; there is no power and no strength except through Allah, the Most High, the Supreme."],
    },
    note: {
      bn: "নবী (সা.) বলেছেন, রাতে ঘুম ভাঙলে যে এ কথাগুলো বলে, তারপর ক্ষমা চায় তাকে ক্ষমা করা হয়, দোয়া করলে কবুল হয় (ইবনে মাজাহ ৩৮৭৮; প্রায় একই শব্দে বুখারী ১১৫৪)। প্রথম চারটি বাক্যকে আল্লাহর কাছে সবচেয়ে প্রিয় কথা বলা হয়েছে (মুসলিম ২১৩৭)।",
      en: "The Prophet said that whoever wakes at night and says these words, then asks forgiveness, is forgiven, and if he makes dua it is answered (Ibn Majah 3878; nearly the same words in Bukhari 1154). The first four phrases are called the words most beloved to Allah (Muslim 2137).",
    },
    tags: ["book", "kalimah", "daily"],
  },
  {
    id: "durud_ayah",
    kind: "ayah",
    title: { bn: "দরুদ পড়ার আদেশ", en: "The command to send blessings" },
    arabic: quran(["33:56"]),
    pronunciation: "ইন্নাল্লা-হা ওয়া মালা-ইকাতাহূ ইউসাল্লূনা 'আলান নাবিয়্যি, ইয়া-আইয়্যুহাল্লাযীনা আ-মানূ সাল্লূ 'আলাইহি ওয়া সাল্লিমূ তাসলীমা।",
    meaning: {
      bn: ["নিশ্চয়ই আল্লাহ ও তাঁর ফেরেশতারা নবীর ওপর দরুদ পাঠান। হে মুমিনগণ, তোমরাও তাঁর ওপর দরুদ পাঠাও এবং যথাযথভাবে সালাম জানাও।"],
      en: ["Allah and His angels send blessings on the Prophet. O you who believe, send blessings on him and greet him with peace."],
    },
    tags: ["book", "durud"],
  },
  {
    id: "durud_virtue",
    kind: "hadith",
    title: { bn: "দরুদ শরিফের ফজিলত", en: "The reward of sending blessings" },
    arabic: hadith("durud_virtue"),
    pronunciation: "মান সাল্লা 'আলাইয়্যা ওয়া-হিদাতান সাল্লাল্লা-হু 'আলাইহি 'আশরা।",
    meaning: {
      bn: ["যে আমার ওপর একবার দরুদ পাঠায়, আল্লাহ তার ওপর দশবার রহমত পাঠান।"],
      en: ["Whoever sends blessings on me once, Allah sends blessings on him ten times."],
    },
    note: {
      bn: "নবী (সা.)-এর নাম বললে বা শুনলে ছোট করে \"সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম\" বলাও দরুদ। নামাজে শেষ বৈঠকে পড়া হয় ওপরের দরুদে ইবরাহিম।",
      en: "Saying \"sallallahu alayhi wa sallam\" on saying or hearing the Prophet's name is also a salawat. In prayer, the Durud Ibrahim above is recited in the final sitting.",
    },
    tags: ["book", "durud"],
  },
];

export const BOOK_ITEMS: SacredItem[] = [...SURAHS, ...KALIMAH, ...PRAYER, ...DAILY, ...RITES];
