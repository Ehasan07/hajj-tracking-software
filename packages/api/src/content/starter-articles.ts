/**
 * Starter guide articles an agency can add with one click and then edit.
 * They are inserted as drafts: the agency checks them against current rules
 * and its own practice before publishing. No prices or dates that change
 * every season are written here.
 *
 * Formatting understood by the reader view: "## " heading, "- " bullet,
 * "1. " numbered step, blank line between paragraphs.
 */

export interface StarterArticle {
  slug: string;
  category: "hajj" | "umrah" | "documents" | "costs" | "health" | "faq";
  sortOrder: number;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
}

export const STARTER_ARTICLES: StarterArticle[] = [
  {
    slug: "required-documents",
    category: "documents",
    sortOrder: 10,
    titleBn: "হজ ও ওমরার জন্য প্রয়োজনীয় কাগজপত্র",
    titleEn: "Documents you need for Hajj and Umrah",
    bodyBn: `নিবন্ধনের সময় নিচের কাগজগুলো সাথে আনুন। সব কাগজ একসাথে না থাকলেও নিবন্ধন শুরু করা যায়, বাকিগুলো পরে জমা দিলেই হবে। প্রতিটা কাগজ জমা ও যাচাইয়ের অবস্থা আমরা আপনাকে জানিয়ে দেব।

## সবার জন্য
- পাসপোর্ট: যাত্রার দিন থেকে অন্তত ৬ মাস মেয়াদ থাকতে হবে। মেয়াদ কম থাকলে আগেই নবায়ন করে নিন।
- সাম্প্রতিক রঙিন ছবি: সাদা ব্যাকগ্রাউন্ডে, মুখ সামনের দিকে, চশমা ছাড়া। টুপি বা হিজাব পরা যাবে, তবে মুখ পুরো দেখা যেতে হবে।
- জাতীয় পরিচয়পত্র (NID): সামনে ও পেছনের দুই পাশের ফটোকপি। ১৮ বছরের কম বয়সীদের জন্য জন্ম নিবন্ধন সনদ।
- মেনিনজাইটিস (ACYW) টিকার সনদ: সৌদি আরবে প্রবেশের জন্য বাধ্যতামূলক। যাত্রার অন্তত ১০ দিন আগে টিকা নিতে হয়।

## শুধু হজের জন্য
- সরকারি হজ পোর্টালের প্রাক-নিবন্ধন (PRP) স্লিপ, ট্র্যাকিং নম্বরসহ।
- নিবন্ধিত চিকিৎসকের স্বাক্ষরসহ স্বাস্থ্য পরীক্ষার সনদ।
- চূড়ান্ত নিবন্ধন সম্পন্ন হলে নিবন্ধন বা ব্যাংক জমার রসিদ।

## মহিলা হাজীদের জন্য
- যিনি মাহরাম হিসেবে সাথে যাবেন, তাঁর নাম ও সম্পর্ক, আর প্রয়োজনে সম্পর্কের প্রমাণ (যেমন বিবাহ সনদ)। এ বিষয়ে সর্বশেষ সরকারি নিয়ম অফিস থেকে জেনে নিন।

## কিছু পরামর্শ
- প্রতিটা কাগজের দুই সেট ফটোকপি করে রাখুন, আর ফোনে ছবি তুলে রাখুন।
- আসল কাগজ জমা দেওয়ার সময় রসিদ বা প্রাপ্তিস্বীকার নিয়ে নিন।
- নাম, জন্ম তারিখ আর পাসপোর্ট নম্বর সব কাগজে একই আছে কিনা মিলিয়ে নিন। বানানের ছোট পার্থক্যও ভিসায় সমস্যা করতে পারে।`,
    bodyEn: `Bring these papers when you register. You can start registering without all of them and hand in the rest later. We will tell you the status of each one.

## For everyone
- Passport: must be valid for at least 6 months from the day you travel. Renew it early if it expires sooner.
- Recent colour photo: white background, facing the camera, no glasses. A cap or hijab is fine as long as the whole face is visible.
- National ID card: copies of both sides. For pilgrims under 18, a birth registration certificate.
- Meningitis (ACYW) vaccination certificate: required to enter Saudi Arabia. Take the vaccine at least 10 days before you travel.

## For Hajj only
- The pre-registration (PRP) slip from the government Hajj portal, with its tracking number.
- A medical fitness certificate signed by a registered doctor.
- Once final registration is done, the registration or bank deposit slip.

## For women pilgrims
- The name and relationship of the mahram travelling with you and, where needed, proof of the relationship (such as a marriage certificate). Ask the office about the latest government rules.

## Tips
- Keep two sets of photocopies of every paper, and a photo of each on your phone.
- When you hand in an original, ask for a receipt.
- Check that your name, date of birth and passport number match on every paper. Even small spelling differences can cause visa problems.`,
  },
  {
    slug: "how-to-perform-umrah",
    category: "umrah",
    sortOrder: 20,
    titleBn: "ওমরা করার নিয়ম, ধাপে ধাপে",
    titleEn: "How to perform Umrah, step by step",
    bodyBn: `ওমরার কাজ চারটি: ইহরাম, তাওয়াফ, সাঈ আর মাথা মুণ্ডন বা চুল ছোট করা। পুরো ওমরা সাধারণত কয়েক ঘণ্টায় শেষ হয়। মাযহাবভেদে কিছু খুঁটিনাটি নিয়ম আলাদা হতে পারে, আমাদের আলেম সফরের আগে প্রশিক্ষণে বিস্তারিত বুঝিয়ে দেবেন।

1. ইহরাম: মিকাতে পৌঁছানোর আগে গোসল করে ইহরামের কাপড় পরুন। পুরুষেরা সেলাইবিহীন দুই টুকরো সাদা কাপড়, মহিলারা স্বাভাবিক শালীন পোশাক। ওমরার নিয়ত করে তালবিয়া পড়া শুরু করুন। বিমানে গেলে মিকাতের ঘোষণার আগেই প্রস্তুত থাকুন।
2. মসজিদুল হারামে প্রবেশ: দোয়া পড়ে ডান পা দিয়ে প্রবেশ করুন।
3. তাওয়াফ: হাজরে আসওয়াদ থেকে শুরু করে কাবাকে বাম দিকে রেখে সাত চক্কর দিন। প্রতি চক্করে হাজরে আসওয়াদের দিকে ইশারা করে তাকবির বলুন। রুকনে ইয়ামানি থেকে হাজরে আসওয়াদ পর্যন্ত "রব্বানা আতিনা..." দোয়াটি পড়ুন।
4. দুই রাকাত নামাজ: তাওয়াফ শেষে সম্ভব হলে মাকামে ইবরাহিমের পেছনে, না হলে মসজিদের যেকোনো জায়গায় দুই রাকাত নামাজ পড়ুন। এরপর জমজমের পানি পান করুন।
5. সাঈ: সাফা থেকে শুরু করে মারওয়ায় শেষ করে সাতবার যাতায়াত করুন। সবুজ বাতির মাঝখানে পুরুষেরা একটু দ্রুত হাঁটবেন।
6. মাথা মুণ্ডন বা চুল ছোট করা: পুরুষেরা মাথা মুণ্ডন করবেন বা পুরো মাথার চুল ছোট করবেন। মহিলারা চুলের আগা থেকে আঙুলের এক কর পরিমাণ কাটবেন। এর মাধ্যমে ওমরা সম্পন্ন হয়।

## ইহরাম অবস্থায় যা করা যাবে না
- সুগন্ধি ব্যবহার, নখ বা চুল কাটা।
- পুরুষদের সেলাই করা পোশাক পরা ও মাথা ঢাকা।
- ঝগড়া-বিবাদ, অশ্লীল কথা ও কাজ।

প্রতিটা ধাপের দোয়া আরবি, উচ্চারণ ও অর্থসহ আমাদের "আয়াত ও দোয়া" অংশে পাবেন।`,
    bodyEn: `Umrah has four parts: ihram, tawaf, sa'i, and shaving or shortening the hair. It usually takes a few hours. Some details differ between madhhabs; our scholar explains them in the pre-departure training.

1. Ihram: before reaching the miqat, take a bath and put on ihram. Men wear two unstitched white sheets; women wear their normal modest clothing. Make the intention for Umrah and begin the talbiyah. If you fly, be ready before the miqat is announced.
2. Entering the Sacred Mosque: enter with your right foot, saying the dua.
3. Tawaf: starting at the Black Stone, walk seven rounds with the Kaabah on your left. Each round, point to the Black Stone and say the takbir. Between the Yemeni Corner and the Black Stone, say "Rabbana atina...".
4. Two rak'ahs: after tawaf, pray two rak'ahs behind Maqam Ibrahim if you can, otherwise anywhere in the mosque. Then drink Zamzam water.
5. Sa'i: walk seven times between Safa and Marwah, starting at Safa and ending at Marwah. Men walk a little faster between the green lights.
6. Shaving or shortening: men shave the head or shorten the hair all over; women cut about a fingertip's length from the ends. This completes the Umrah.

## Not allowed in ihram
- Perfume, cutting nails or hair.
- For men, stitched clothing and covering the head.
- Arguing, and obscene words or deeds.

The duas for each step, in Arabic with pronunciation and meaning, are in the "Ayat and duas" section.`,
  },
  {
    slug: "five-days-of-hajj",
    category: "hajj",
    sortOrder: 30,
    titleBn: "হজের পাঁচ দিন: এক নজরে",
    titleEn: "The five days of Hajj at a glance",
    bodyBn: `হজের মূল কাজগুলো ৮ থেকে ১২ বা ১৩ জিলহজের মধ্যে হয়। বাংলাদেশের বেশিরভাগ হাজী তামাত্তু হজ করেন: আগে ওমরা করে ইহরাম খুলে ফেলেন, তারপর ৮ জিলহজ হজের জন্য নতুন করে ইহরাম বাঁধেন।

## ৮ জিলহজ: মিনা
- মক্কায় নিজের জায়গা থেকে হজের নিয়তে ইহরাম বেঁধে তালবিয়া পড়তে পড়তে মিনায় যাবেন।
- মিনায় জোহর থেকে পরদিন ফজর পর্যন্ত নামাজ আদায় করবেন।

## ৯ জিলহজ: আরাফা ও মুজদালিফা
- সূর্যোদয়ের পর আরাফায় যাবেন। আরাফায় অবস্থানই হজের মূল কাজ।
- সূর্যাস্ত পর্যন্ত দোয়া, যিকির আর ইস্তিগফারে সময় কাটাবেন।
- সূর্যাস্তের পর মুজদালিফায় গিয়ে মাগরিব ও এশা একসাথে পড়বেন, খোলা আকাশের নিচে রাত কাটাবেন আর কঙ্কর সংগ্রহ করবেন।

## ১০ জিলহজ: ঈদের দিন
- জামরাতুল আকাবায় সাতটি কঙ্কর মারবেন।
- কুরবানি দেবেন (তামাত্তু ও কিরান হজকারীদের জন্য)।
- মাথা মুণ্ডন বা চুল ছোট করবেন।
- মক্কায় গিয়ে তাওয়াফে যিয়ারত ও সাঈ করবেন।

## ১১–১৩ জিলহজ: মিনায় রাত যাপন
- প্রতিদিন দুপুরের পর তিন জামরায় সাতটি করে কঙ্কর মারবেন।
- চাইলে ১২ তারিখ সূর্যাস্তের আগে মিনা ছাড়া যায়, অথবা ১৩ তারিখ পর্যন্ত থাকা যায়।

## দেশে ফেরার আগে
- বিদায়ী তাওয়াফ করবেন।

১০ জিলহজের কাজগুলোর ক্রম আর কোন কাজ বাদ পড়লে কী করতে হবে, তা মাযহাব অনুযায়ী ভিন্ন হতে পারে। আমাদের আলেম মক্কায় পৌঁছে প্রতিটা দিনের আগের রাতে বিস্তারিত বুঝিয়ে দেবেন।`,
    bodyEn: `The main rites of Hajj take place between 8 and 12 or 13 Dhul Hijjah. Most pilgrims from Bangladesh perform tamattu: they first complete an Umrah and leave ihram, then enter ihram again for Hajj on 8 Dhul Hijjah.

## 8 Dhul Hijjah: Mina
- Enter ihram for Hajj from where you are staying in Makkah and go to Mina with the talbiyah.
- Pray at Mina from Dhuhr until the next Fajr.

## 9 Dhul Hijjah: Arafah and Muzdalifah
- After sunrise go to Arafah. Standing at Arafah is the heart of Hajj.
- Spend the time until sunset in dua, dhikr and seeking forgiveness.
- After sunset go to Muzdalifah, pray Maghrib and Isha together, spend the night under the open sky and collect pebbles.

## 10 Dhul Hijjah: the day of Eid
- Throw seven pebbles at Jamrat al-Aqabah.
- Offer the sacrifice (for those doing tamattu or qiran).
- Shave or shorten the hair.
- Go to Makkah for tawaf al-ifadah and sa'i.

## 11–13 Dhul Hijjah: nights at Mina
- Each day after noon, throw seven pebbles at each of the three jamarat.
- You may leave Mina before sunset on the 12th, or stay until the 13th.

## Before going home
- Make the farewell tawaf.

The order of the acts on 10 Dhul Hijjah, and what to do if one is missed, can differ between madhhabs. Our scholar explains each day in Makkah the night before.`,
  },
  {
    slug: "packing-list",
    category: "hajj",
    sortOrder: 40,
    titleBn: "সাথে কী নেবেন",
    titleEn: "What to pack",
    bodyBn: `ব্যাগ যত হালকা, সফর তত সহজ। বিমান সংস্থার ওজনের সীমা টিকিটে লেখা থাকে, সেটা মিলিয়ে গুছিয়ে নিন।

## কাগজপত্র (হাতব্যাগে রাখুন)
- পাসপোর্ট, ভিসা, বিমান টিকিট ও টিকার সনদ।
- সব কাগজের ফটোকপি, আর ফোনে ছবি।
- আমাদের অফিসের ফোন নম্বর আর মক্কা-মদিনার হোটেলের ঠিকানা লেখা কার্ড।

## পোশাক
- পুরুষদের জন্য অন্তত দুই সেট ইহরামের কাপড় ও একটি বেল্ট।
- মহিলাদের জন্য আরামদায়ক, ঢিলেঢালা শালীন পোশাক।
- নরম, পেছন খোলা স্যান্ডেল, যেটা পরে অনেকক্ষণ হাঁটা যায়।
- মিনা ও মুজদালিফার জন্য হালকা চাদর।

## স্বাস্থ্য
- নিয়মিত যে ওষুধ খান, পুরো সফরের পরিমাণ, চিকিৎসকের ব্যবস্থাপত্রসহ।
- খাবার স্যালাইন, ব্যথার ওষুধ, ব্যান্ডেজ।
- সুগন্ধিহীন সাবান ও লোশন (ইহরাম অবস্থার জন্য)।
- মাস্ক, ছাতা ও পানির বোতল।

## অন্যান্য
- কঙ্কর রাখার ছোট থলে।
- ফোনের চার্জার ও পাওয়ার ব্যাংক।
- কোরআন শরিফ ও দোয়ার বই।
- সামান্য সৌদি রিয়াল নগদ।

দামি গয়না বা অতিরিক্ত নগদ টাকা সাথে নেবেন না।`,
    bodyEn: `The lighter the bag, the easier the journey. Your ticket shows the airline's weight limit; pack to it.

## Papers (keep in your hand luggage)
- Passport, visa, air ticket and vaccination certificate.
- Photocopies of every paper, and photos on your phone.
- A card with our office phone number and your hotel addresses in Makkah and Madinah.

## Clothing
- For men, at least two sets of ihram and a belt.
- For women, comfortable, loose, modest clothes.
- Soft sandals open at the back that you can walk in for hours.
- A light sheet for Mina and Muzdalifah.

## Health
- Your regular medicines for the whole trip, with the prescription.
- Oral rehydration salts, painkillers, plasters.
- Unscented soap and lotion (for ihram).
- A mask, an umbrella and a water bottle.

## Other
- A small pouch for pebbles.
- Phone charger and power bank.
- A Quran and a book of duas.
- A little Saudi riyal in cash.

Leave expensive jewellery and large amounts of cash at home.`,
  },
  {
    slug: "staying-healthy",
    category: "health",
    sortOrder: 50,
    titleBn: "সফরে সুস্থ থাকার পরামর্শ",
    titleEn: "Staying healthy on the journey",
    bodyBn: `মক্কা ও মদিনায় প্রচণ্ড গরম আর ভিড় থাকে, আর হাঁটতে হয় অনেক। একটু সাবধান থাকলে বেশিরভাগ অসুস্থতা এড়ানো যায়।

- প্রচুর পানি পান করুন, তৃষ্ণা পাওয়ার আগেই। জমজমের পানি সারাদিন পাওয়া যায়।
- দুপুরের রোদে বাইরে কম থাকুন, ছাতা ব্যবহার করুন।
- ভিড়ের মধ্যে মাস্ক পরুন, আর বারবার হাত ধুয়ে নিন।
- নিয়মিত ওষুধ সময়মতো খান। ডায়াবেটিস বা উচ্চ রক্তচাপ থাকলে বাড়তি সতর্ক থাকুন, আর সাথে থাকা গাইডকে জানিয়ে রাখুন।
- বেশি হাঁটার কারণে পায়ে ফোসকা পড়তে পারে। নতুন জুতা নয়, পুরনো আরামদায়ক স্যান্ডেল নিন।
- আরাফা ও মিনার দিনগুলোর আগে যথেষ্ট বিশ্রাম নিন। সবচেয়ে কষ্টের দিনগুলোর জন্য শক্তি জমিয়ে রাখুন।
- অসুস্থ বোধ করলে দেরি না করে আমাদের গাইডকে জানান। সৌদি সরকারের স্বাস্থ্যকেন্দ্রে হাজীদের চিকিৎসা দেওয়া হয়।

বয়স্ক হাজীদের সাথে পরিবারের একজন থাকলে ভালো, হুইলচেয়ারের প্রয়োজন হলে আগে থেকে অফিসে জানিয়ে রাখুন।`,
    bodyEn: `Makkah and Madinah are very hot and crowded, and you walk a lot. A little care prevents most illness.

- Drink plenty of water, before you feel thirsty. Zamzam water is available all day.
- Stay out of the midday sun where you can, and use an umbrella.
- Wear a mask in crowds, and wash your hands often.
- Take your regular medicines on time. If you have diabetes or high blood pressure, take extra care and tell your guide.
- Long walks can cause blisters. Bring old, comfortable sandals, not new shoes.
- Rest well before the days of Arafah and Mina, and save your strength for them.
- If you feel unwell, tell our guide straight away. The Saudi government's health centres treat pilgrims.

Elderly pilgrims are best accompanied by a family member. If a wheelchair is needed, tell the office in advance.`,
  },
  {
    slug: "payments-and-receipts",
    category: "costs",
    sortOrder: 60,
    titleBn: "টাকা পরিশোধ ও রসিদ",
    titleEn: "Payments and receipts",
    bodyBn: `প্যাকেজের টাকা একবারে বা কিস্তিতে দেওয়া যায়। কোন কিস্তি কবে দিতে হবে, তা নিবন্ধনের সময় অফিস থেকে জানিয়ে দেওয়া হবে।

## কীভাবে দেবেন
- অফিসে এসে নগদে।
- bKash, Nagad বা Rocket-এ। পাঠানোর পর ট্রানজেকশন আইডি অবশ্যই জানাবেন।
- ব্যাংকে জমা বা চেকে। জমার রসিদের ছবি পাঠিয়ে দিন।

## রসিদ
- প্রতিটা টাকার জন্য আপনি একটি ক্রমিক নম্বরসহ রসিদ পাবেন, যাতে টাকার অঙ্ক কথায় লেখা থাকে।
- রসিদে একটি QR কোড আছে। ফোনে স্ক্যান করলেই দেখা যাবে রসিদটি আসল কিনা।
- রসিদে আপনার মোট পরিশোধ আর বাকি টাকার হিসাবও লেখা থাকে।
- সব রসিদ যত্ন করে রাখুন।

রসিদ ছাড়া কাউকে টাকা দেবেন না। কোনো রসিদ নিয়ে সন্দেহ হলে সরাসরি অফিসে ফোন করুন।`,
    bodyEn: `You can pay the package price at once or in instalments. The office tells you the instalment dates when you register.

## How to pay
- In cash at the office.
- By bKash, Nagad or Rocket. Always send us the transaction ID afterwards.
- By bank deposit or cheque. Send us a photo of the deposit slip.

## Receipts
- For every payment you get a numbered receipt with the amount written in words.
- Each receipt has a QR code. Scan it with your phone to check that it is genuine.
- The receipt also shows your total paid and what is still due.
- Keep all your receipts safe.

Never pay anyone without getting a receipt. If you are unsure about a receipt, call the office directly.`,
  },
  {
    slug: "common-questions",
    category: "faq",
    sortOrder: 70,
    titleBn: "সাধারণ প্রশ্ন ও উত্তর",
    titleEn: "Common questions",
    bodyBn: `## কত আগে নিবন্ধন করা উচিত?
সরকারি প্রাক-নিবন্ধন সাধারণত হজের অনেক মাস আগে শুরু হয়, আর কোটা সীমিত। যত আগে নিবন্ধন করবেন, তত নিশ্চিন্ত থাকবেন। চলতি মৌসুমের সময়সূচি অফিস থেকে জেনে নিন।

## পাসপোর্টের মেয়াদ কত দিন থাকতে হবে?
যাত্রার দিন থেকে অন্তত ৬ মাস। কম থাকলে আগেই নবায়ন করুন।

## আমি কিস্তিতে টাকা দিতে পারব কি?
হ্যাঁ। প্রতিটা কিস্তির জন্য আলাদা রসিদ পাবেন, আর মোট বাকি কত, তা রসিদেই লেখা থাকবে।

## মহিলারা কি মাহরাম ছাড়া যেতে পারবেন?
এ বিষয়ে সৌদি আরব ও বাংলাদেশ সরকারের নিয়ম সময়ে সময়ে বদলায়। চলতি নিয়ম আর ধর্মীয় দিক, দুটোই অফিসে আমাদের আলেমের সাথে কথা বলে জেনে নিন।

## সফরের আগে কোনো প্রশিক্ষণ হবে কি?
হ্যাঁ। যাত্রার আগে হজ ও ওমরার নিয়ম, দোয়া আর সফরের খুঁটিনাটি নিয়ে প্রশিক্ষণ হবে। তারিখ আপনাকে জানানো হবে।

## মক্কা-মদিনায় কোনো সমস্যা হলে কার সাথে যোগাযোগ করব?
আমাদের গাইড পুরো সফরে আপনার সাথে থাকবেন। তাঁর নম্বর আর হোটেলের ঠিকানা আপনাকে আগে থেকেই দেওয়া হবে।`,
    bodyEn: `## How early should I register?
Government pre-registration usually opens many months before Hajj, and the quota is limited. The earlier you register, the easier it is. Ask the office for this season's dates.

## How long must my passport be valid?
At least 6 months from the day you travel. Renew it early if it is shorter.

## Can I pay in instalments?
Yes. You get a separate receipt for each instalment, and each receipt shows how much is still due.

## Can women travel without a mahram?
Saudi and Bangladeshi rules on this change from time to time. Speak to our scholar at the office about both the current rules and the religious side.

## Is there training before the journey?
Yes. Before departure there is a session on the rites of Hajj and Umrah, the duas, and practical details of the trip. We will tell you the date.

## Whom do I contact if there is a problem in Makkah or Madinah?
Our guide travels with you for the whole journey. You will get the guide's number and your hotel addresses beforehand.`,
  },
];
