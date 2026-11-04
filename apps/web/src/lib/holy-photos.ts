/**
 * Photographs of the holy places, used across the public pages. Each one is
 * openly licensed on Wikimedia Commons and kept on our own server (resized to
 * WebP); its author and licence are shown wherever it appears, as the
 * licences ask. Before adding another, check its licence on its Commons page:
 * only CC0, public domain, CC BY or CC BY-SA.
 */

export interface HolyPhoto {
  /** Files in public/images/holy: `${file}-800.webp` and `${file}-1600.webp`. */
  file: string;
  width: number;
  height: number;
  /** What to keep in view when a wide frame crops it (CSS object-position). */
  focus?: string;
  alt: { bn: string; en: string };
  place: { bn: string; en: string };
  /** `edited`: we cropped it, which the CC BY licences ask us to say. */
  credit: { author: string; license: string; licenseUrl: string | null; page: string; edited?: boolean };
}

export const HOLY_PHOTOS = {
  kaabaDoor: {
    file: "kaaba-door",
    width: 3840,
    height: 2880,
    alt: { bn: "কাবা শরিফ, সোনালি দরজা আর মাতাফ", en: "The Kaaba with its golden door, and the mataf around it" },
    place: { bn: "কাবা শরিফ, মসজিদুল হারাম, মক্কা", en: "The Kaaba, Masjid al-Haram, Makkah" },
    credit: {
      author: "Richard Mortel",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      page: "https://commons.wikimedia.org/wiki/File:The_Ka%27ba,_Great_Mosque_of_Mecca,_Saudi_Arabia_(4).jpg",
    },
  },
  kaabaHajj: {
    file: "kaaba-hajj",
    width: 3840,
    height: 2686,
    alt: { bn: "হজের সময় কাবা ঘিরে তাওয়াফ করছেন হাজীরা", en: "Pilgrims circling the Kaaba during Hajj" },
    place: { bn: "হজের সময় মসজিদুল হারাম, মক্কা", en: "Masjid al-Haram during Hajj, Makkah" },
    credit: {
      author: "Adli Wahid",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:The_Kaaba_during_Hajj_(edited).jpg",
    },
  },
  greenDome: {
    file: "green-dome",
    width: 3840,
    height: 2560,
    alt: { bn: "মসজিদে নববীর সবুজ গম্বুজ ও মিনার", en: "The Green Dome and minarets of the Prophet's Mosque" },
    place: { bn: "মসজিদে নববী, মদিনা", en: "Masjid an-Nabawi, Madinah" },
    credit: {
      author: "TheHadiRahim",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      page: "https://commons.wikimedia.org/wiki/File:Medium_shot_of_the_Green_Dome_at_The_Prophet%27s_Mosque_(Al_Masjid-e-Nabawi).jpg",
    },
  },
  nabawiUmbrellas: {
    file: "nabawi-umbrellas",
    width: 3840,
    height: 2880,
    alt: { bn: "মসজিদে নববীর চত্বরে খোলা ছাতা", en: "The open umbrellas over the courtyard of the Prophet's Mosque" },
    place: { bn: "মসজিদে নববীর চত্বর, মদিনা", en: "The courtyard of Masjid an-Nabawi, Madinah" },
    credit: {
      author: "King Eliot",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:Masjid_e_Nabawi_Courtyard_Umbrellas.jpg",
    },
  },
  haramNight: {
    file: "haram-night",
    width: 3264,
    height: 2081,
    focus: "50% 45%",
    alt: { bn: "রাতে কাবা ঘিরে তাওয়াফ, আলো জ্বলা মসজিদুল হারাম", en: "Tawaf around the Kaaba at night, with the Sacred Mosque lit up" },
    place: { bn: "রাতের তাওয়াফ, মসজিদুল হারাম", en: "Tawaf at night, Masjid al-Haram" },
    credit: {
      author: "Basheer Olakara",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      page: "https://commons.wikimedia.org/wiki/File:Masjid_al-Haram,_Tawaf_20092012_1130PM_(8008466944).jpg",
      edited: true,
    },
  },
  sai: {
    file: "sai",
    width: 3264,
    height: 1836,
    alt: { bn: "ইহরাম পরা হাজীরা সাফা আর মারওয়ার মাঝে সাঈ করছেন", en: "Pilgrims in ihram walking between Safa and Marwah" },
    place: { bn: "সাফা ও মারওয়ার মাঝে সাঈ, মসজিদুল হারাম", en: "Sa'i between Safa and Marwah, Masjid al-Haram" },
    credit: {
      author: "مانفی",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:Sa%27yee.jpg",
    },
  },
  minaPilgrims: {
    file: "mina-pilgrims",
    width: 3264,
    height: 2448,
    focus: "50% 30%",
    alt: { bn: "ইহরামের সাদা কাপড়ে হাজীরা মিনার দিকে হাঁটছেন", en: "Pilgrims in white ihram walking to Mina" },
    place: { bn: "৮ জিলহজ, মিনার পথে হাজীরা", en: "8 Dhul Hijjah, pilgrims on the way to Mina" },
    credit: {
      author: "Omar Chatriwala / Al Jazeera English",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      page: "https://commons.wikimedia.org/wiki/File:Pilgrims_stream_into_Mina_ahead_of_the_day_of_Arafat_-_Flickr_-_Al_Jazeera_English.jpg",
    },
  },
  arafah: {
    file: "arafah",
    width: 2992,
    height: 1995,
    focus: "50% 35%",
    alt: { bn: "জাবালে রহমতের পাথুরে ঢালে হাজীরা", en: "Pilgrims on the rocky slopes of Jabal al-Rahmah" },
    place: { bn: "জাবালে রহমত, আরাফা", en: "Jabal al-Rahmah, Arafah" },
    credit: {
      author: "Edibiz",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      page: "https://commons.wikimedia.org/wiki/File:Mount_Arafat(Jabal_ar-Ra%E1%B8%A5mah).jpg",
    },
  },
  muzdalifah: {
    file: "muzdalifah",
    width: 3264,
    height: 2448,
    alt: { bn: "সূর্যাস্তে আরাফা থেকে মুজদালিফার দিকে হাজীদের ঢল", en: "Pilgrims leaving Arafah for Muzdalifah at sunset" },
    place: { bn: "সূর্যাস্তে মুজদালিফার পথে", en: "To Muzdalifah at sunset" },
    credit: {
      author: "Al Jazeera English",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      page: "https://commons.wikimedia.org/wiki/File:Hajj_pilgrims_leaving_Arafat_in_droves_for_Muzdalifah_at_sunset_-_Flickr_-_Al_Jazeera_English.jpg",
    },
  },
  jamarat: {
    file: "jamarat",
    width: 3840,
    height: 2160,
    alt: { bn: "পাহাড়ের কোলে জামারাত ব্রিজ, পথে হাজীরা", en: "The Jamarat bridge below the hills, with pilgrims on the road" },
    place: { bn: "জামারাত, মিনা", en: "The Jamarat, Mina" },
    credit: {
      author: "Aiman titi",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:Jamarat_Bridge_22.JPG",
    },
  },
  minaNight: {
    file: "mina-night",
    width: 3216,
    height: 2136,
    alt: { bn: "রাতে আলো জ্বলা মিনার তাঁবুর শহর", en: "The tent city of Mina lit up at night" },
    place: { bn: "রাতের মিনা, তাঁবুর শহর", en: "Mina at night, the tent city" },
    credit: {
      author: "Fadi El Binni / Al Jazeera English",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      page: "https://commons.wikimedia.org/wiki/File:The_Hajj_kicks_into_full_gear_-_Flickr_-_Al_Jazeera_English_(6).jpg",
    },
  },
  quba: {
    file: "quba",
    width: 3840,
    height: 2505,
    alt: { bn: "সাদা গম্বুজ আর চার মিনারের মসজিদে কুবা", en: "Quba Mosque with its white domes and four minarets" },
    place: { bn: "মসজিদে কুবা, মদিনা", en: "Quba Mosque, Madinah" },
    credit: {
      author: "Saudi Press Agency (SPA)",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:The_Historic_Quba_Mosque_in_Madinah_(2025).jpg",
    },
  },
  jabalNour: {
    file: "jabal-nour",
    width: 3840,
    height: 2880,
    alt: { bn: "জাবালে নূর, যার চূড়ার কাছে হেরা গুহা", en: "Jabal al-Nour, with the cave of Hira near its peak" },
    place: { bn: "জাবালে নূর (হেরা গুহা), মক্কা", en: "Jabal al-Nour (cave of Hira), Makkah" },
    credit: {
      author: "Kaliper1",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      page: "https://commons.wikimedia.org/wiki/File:Jabbal_An-Nour_(2024).jpg",
    },
  },
} satisfies Record<string, HolyPhoto>;

/** The photo shown with each step of Umrah and Hajj (ids from STEPS), where there is one. */
export const STEP_PHOTO: Partial<Record<string, HolyPhotoKey>> = {
  umrah_tawaf: "haramNight",
  umrah_sai: "sai",
  hajj_day8: "minaPilgrims",
  hajj_day9: "arafah",
  hajj_day10: "jamarat",
  hajj_days11_13: "minaNight",
};

export type HolyPhotoKey = keyof typeof HOLY_PHOTOS;
