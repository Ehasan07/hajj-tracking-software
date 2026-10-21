/**
 * The privacy policy, in both languages. Every statement here describes what
 * the software actually does; change it together with the code it describes
 * (sign-in records in server/maintenance.ts, encryption in @hajj/api/crypto,
 * erasing in services/erase.ts, cookies in server/auth.ts and device-otp.ts).
 */

export const UPDATED = "2026-10-21";

export interface Section {
  id: string;
  title: string;
  /** Paragraphs; a string starting with "• " is a list item. */
  body: string[];
}

export interface Policy {
  title: string;
  intro: string;
  updated: string;
  contents: string;
  contactTitle: string;
  /** Followed by the contact address. */
  contactLead: string;
  contactWithout: string;
  sections: Section[];
}

const bn: Policy = {
  title: "গোপনীয়তা নীতি",
  intro:
    "হজ ট্র্যাকিং (hajj.takatracker.com) হজ ও ওমরাহ এজেন্সির জন্য একটি সফটওয়্যার, সাথে সবার জন্য খোলা একটি গাইড বই আর Android অ্যাপ। এই পাতায় সহজ ভাষায় লেখা আছে আমরা কোন তথ্য রাখি, কেন রাখি, কার কাছে যায়, আর আপনি কীভাবে তা মুছে ফেলতে পারেন।",
  updated: "সর্বশেষ হালনাগাদ",
  contents: "এই পাতায়",
  contactTitle: "যোগাযোগ",
  contactLead: "গোপনীয়তা নিয়ে যেকোনো প্রশ্ন বা তথ্য মোছার অনুরোধ পাঠান: ",
  contactWithout:
    "হাজী, গ্রাহক বা কর্মচারী হলে প্রথমে আপনার এজেন্সির সাথে যোগাযোগ করুন। এজেন্সির মালিক বা অন্য কোনো প্রশ্নে Google Play-তে আমাদের অ্যাপের পাতায় দেওয়া ইমেইলে লিখুন।",
  sections: [
    {
      id: "who",
      title: "কে কোন তথ্যের দায়িত্বে",
      body: [
        "এজেন্সির স্টাফদের অ্যাকাউন্ট (নাম, ইমেইল, পাসওয়ার্ড, লগইনের রেকর্ড) আমরা দেখাশোনা করি।",
        "হাজী, দোকানের গ্রাহক, কর্মচারী আর অনুসন্ধানের তথ্য এজেন্সি নিজে সফটওয়্যারে লেখে। কী তথ্য নেবে আর কতদিন রাখবে, তা ঠিক করে সেই এজেন্সি। আমরা শুধু এজেন্সির হয়ে তা নিরাপদে রাখি ও দেখাই, অন্য কোনো কাজে ব্যবহার করি না।",
        "গাইড বই পড়তে কোনো অ্যাকাউন্ট লাগে না, আর সেখান থেকে কোনো ব্যক্তিগত তথ্য নেওয়া হয় না।",
      ],
    },
    {
      id: "collect",
      title: "কোন তথ্য রাখা হয়",
      body: [
        "• স্টাফের অ্যাকাউন্ট: নাম, ইমেইল, পাসওয়ার্ড (শুধু scrypt দিয়ে hash করা রূপে, আসল পাসওয়ার্ড কোথাও থাকে না), আর মোবাইল নম্বর যদি যাচাই করা হয়।",
        "• লগইনের নিরাপত্তা: লগইনের সময়, IP ঠিকানা আর ব্রাউজার/ডিভাইসের নাম (যেমন \"Desktop · Chrome · Windows\")। এগুলো দিয়ে নতুন ডিভাইস চেনা হয় আর সতর্কবার্তা পাঠানো হয়।",
        "• এজেন্সি যা লেখে: হাজীর নাম, পরিবারের তথ্য, ফোন, ইমেইল, জন্মতারিখ, ঠিকানা, পাসপোর্ট ও NID নম্বর, কাগজপত্র ও স্ক্যান, টাকা জমার রসিদ; দোকানের গ্রাহক ও বিক্রি; কর্মচারী ও বেতন; অনুসন্ধান।",
        "• এজেন্সির ওয়েবসাইটে দর্শক যা পাঠান: অনুসন্ধানের ফর্মে নাম, ফোন আর নোট; মতামতে নাম, এলাকা আর লেখা। এগুলো শুধু সেই এজেন্সির কাছে যায়।",
        "• গাইড বই ও অ্যাপ: লেখার আকার আর কোন ভাষা দেখাবেন, সেই পছন্দ শুধু আপনার ফোনে বা কম্পিউটারে থাকে, আমাদের কাছে আসে না।",
        "আমরা কোনো অ্যানালিটিক্স, বিজ্ঞাপন বা ট্র্যাকিং ব্যবহার করি না।",
      ],
    },
    {
      id: "use",
      title: "তথ্য কী কাজে লাগে",
      body: [
        "সফটওয়্যার চালাতে: হাজীর রেকর্ড, রসিদ, হিসাব, বেতন আর রিপোর্ট। লগইন নিরাপদ রাখতে: নতুন ডিভাইসে ইমেইলে কোড, সন্দেহজনক লগইনে সতর্কবার্তা, বারবার ভুল চেষ্টায় সাময়িক তালা।",
        "এজেন্সি চালু করলে হাজীকে টাকা জমার SMS আর নোটিশ পাঠাতে।",
        "আমরা কারো তথ্য বিক্রি করি না, বিজ্ঞাপনে ব্যবহার করি না, আর কারো প্রোফাইল বানাই না।",
      ],
    },
    {
      id: "share",
      title: "কার কাছে তথ্য যায়",
      body: [
        "• ইমেইল পাঠাতে ZeptoMail (Zoho): প্রাপকের ইমেইল, নাম আর বার্তা (যেমন লগইনের কোড)।",
        "• SMS পাঠাতে বাংলাদেশের একটি SMS গেটওয়ে, শুধু এজেন্সি SMS চালু করলে: মোবাইল নম্বর আর বার্তা।",
        "• Hetzner Online: যাদের server-এ সফটওয়্যার আর তথ্য রাখা হয় (জার্মানির ফালকেনস্টাইন)।",
        "এক এজেন্সির তথ্য অন্য কোনো এজেন্সি দেখতে পারে না। এজেন্সির ভেতরেও স্টাফ শুধু তাঁর দায়িত্বের অংশটুকু দেখেন। আইন অনুযায়ী বাধ্য হলে ছাড়া আর কারো কাছে তথ্য দেওয়া হয় না।",
      ],
    },
    {
      id: "security",
      title: "তথ্য কীভাবে সুরক্ষিত",
      body: [
        "• সব যোগাযোগ HTTPS দিয়ে এনক্রিপ্ট করা।",
        "• পাসপোর্ট আর NID নম্বর AES-256-GCM দিয়ে এনক্রিপ্ট করে রাখা হয়। খোঁজার জন্য গোপন চাবি দিয়ে বানানো hash ব্যবহার হয়, আসল নম্বর নয়।",
        "• কাগজপত্র আর স্ক্যান রাখার আগেই এনক্রিপ্ট করা হয়, আর শুধু অনুমতিপ্রাপ্ত স্টাফ সফটওয়্যারের ভেতর থেকেই দেখতে পারেন। কেউ পাসপোর্ট বা NID-এর কপি দেখলে তা অডিট লগে লেখা থাকে।",
        "• ডেটাবেসের নিয়ম দিয়েই প্রতিটি এজেন্সির তথ্য আলাদা করা।",
        "• নতুন ডিভাইসে লগইন করতে ইমেইলের কোড লাগে। ৫ বার ভুল পাসওয়ার্ড দিলে ১৫ মিনিট লগইন বন্ধ থাকে।",
        "• প্রতিদিন ব্যাকআপ নেওয়া হয়।",
      ],
    },
    {
      id: "cookies",
      title: "কুকি আর ডিভাইসে রাখা তথ্য",
      body: [
        "শুধু সফটওয়্যার চালানোর জন্য দরকারি কুকি ব্যবহার হয়: লগইন সেশন (৭ দিন), বিশ্বস্ত ডিভাইস (৯০ দিন), আর লগইনের কোড চলাকালীন একটি কুকি (১০ মিনিট)। এগুলো JavaScript পড়তে পারে না, আর শুধু HTTPS-এ পাঠানো হয়।",
        "অ্যাপ ইন্টারনেট ছাড়া চালানোর জন্য শুধু খোলা পাতাগুলোর (যেমন গাইড বই) কপি ফোনে রাখে। লগইনের পরের কোনো পাতা বা তথ্য ফোনে রাখা হয় না।",
      ],
    },
    {
      id: "retention",
      title: "কতদিন রাখা হয়",
      body: [
        "এজেন্সি সফটওয়্যার ব্যবহার করা পর্যন্ত তার রেকর্ড থাকে, অথবা এজেন্সি মুছে না ফেলা পর্যন্ত।",
        "লগইনের রেকর্ড নিজে থেকে পরিষ্কার হয়: শেষ হওয়া সেশন মুছে যায়, কোডের মেয়াদ শেষ হওয়ার এক দিন পর কোড মুছে যায়, আর বাতিল করা ডিভাইস ৩০ দিন পর মুছে যায়।",
        "কোনো রেকর্ড যে ফাইল আর ব্যবহার করে না (যেমন বদলানো লোগো বা মুছে ফেলা কাগজ), তা এক দিন পর মুছে যায়।",
        "ব্যাকআপ ১৪ দিন রাখা হয়, তারপর মুছে যায়।",
      ],
    },
    {
      id: "rights",
      title: "আপনার তথ্য দেখা, ঠিক করা ও মোছা",
      body: [
        "• হাজী, গ্রাহক বা কর্মচারী হলে আপনার এজেন্সিকে বলুন। এজেন্সি সফটওয়্যারেই আপনার তথ্য ঠিক করতে বা স্থায়ীভাবে মুছে ফেলতে পারে: নাম, যোগাযোগ, ঠিকানা, পাসপোর্ট ও NID, কাগজপত্র, আর অডিট লগে এসবের কপি। টাকার হিসাব আইনের কারণে রেফারেন্সসহ থেকে যায়, তবে নাম ছাড়া।",
        "• স্টাফ হলে \"আমার ডিভাইস\" পাতা থেকে নিজের অ্যাকাউন্ট নিজেই মুছতে পারেন। এজেন্সি আপনাকে team থেকে সরিয়ে দিলেও আপনার লগইন মুছে যায়।",
        "• এজেন্সির মালিক এজেন্সি বন্ধ করে তার তথ্য মুছতে চাইলে নিচের ঠিকানায় যোগাযোগ করুন।",
      ],
    },
    {
      id: "children",
      title: "শিশু",
      body: [
        "সফটওয়্যারটি এজেন্সির জন্য। কোনো শিশু হাজী হলে এজেন্সি অভিভাবকের সম্মতিতে তার তথ্য লেখে, আর সেই দায়িত্ব এজেন্সির। গাইড বই যে কেউ পড়তে পারে, সেখান থেকে কোনো তথ্য নেওয়া হয় না।",
      ],
    },
    {
      id: "changes",
      title: "এই নীতি বদলালে",
      body: ["নীতি বদলালে এই পাতায় নতুন তারিখসহ জানানো হবে।"],
    },
  ],
};

const en: Policy = {
  title: "Privacy policy",
  intro:
    "Hajj Tracking (hajj.takatracker.com) is software for Hajj and Umrah agencies, with a guide book open to everyone and an Android app. This page says, in plain words, what we keep, why, who it goes to, and how you can have it erased.",
  updated: "Last updated",
  contents: "On this page",
  contactTitle: "Contact",
  contactLead: "Send any privacy question or erasure request to ",
  contactWithout:
    "If you are a pilgrim, customer or employee, contact your agency first. Agency owners and anyone else can write to the email on our app's Google Play page.",
  sections: [
    {
      id: "who",
      title: "Who is responsible for what",
      body: [
        "We look after agency staff accounts (name, email, password, sign-in records).",
        "Pilgrims', shop customers', employees' and inquirers' details are entered by the agency, which decides what to collect and how long to keep it. We store and show them for that agency only, and use them for nothing else.",
        "Reading the guide book needs no account, and no personal data is collected there.",
      ],
    },
    {
      id: "collect",
      title: "What is kept",
      body: [
        "• Staff accounts: name, email, password (only as a scrypt hash; the password itself is never stored), and a mobile number if it was verified.",
        "• Sign-in security: time of sign-in, IP address, and a browser/device label (such as \"Desktop · Chrome · Windows\"), used to recognise new devices and send alerts.",
        "• What agencies enter: pilgrims' names, family details, phone, email, date of birth, addresses, passport and NID numbers, papers and scans, and receipts; shop customers and sales; employees and payroll; inquiries.",
        "• What visitors send on an agency's website: the inquiry form's name, phone and note; a review's name, place and text. These go to that agency only.",
        "• Guide book and app: your text size and which languages to show are kept on your own phone or computer, not sent to us.",
        "We use no analytics, advertising or tracking.",
      ],
    },
    {
      id: "use",
      title: "What it is used for",
      body: [
        "Running the software: pilgrim records, receipts, books, payroll and reports. Keeping sign-in safe: an email code on a new device, alerts about sign-ins, and a short lock after repeated wrong passwords.",
        "Sending payment texts and notices to pilgrims, when the agency turns SMS on.",
        "We never sell anyone's data, use it for advertising, or build profiles.",
      ],
    },
    {
      id: "share",
      title: "Who it goes to",
      body: [
        "• ZeptoMail (Zoho), to send email: the recipient's address, name and the message (such as a sign-in code).",
        "• A Bangladeshi SMS gateway, only when an agency turns SMS on: the mobile number and the message.",
        "• Hetzner Online, whose server in Falkenstein, Germany runs the software and holds the data.",
        "No agency can see another agency's data, and within an agency staff see only what their role needs. Nothing goes to anyone else unless the law requires it.",
      ],
    },
    {
      id: "security",
      title: "How it is protected",
      body: [
        "• Everything travels over HTTPS.",
        "• Passport and NID numbers are encrypted with AES-256-GCM; searching uses hashes made with a secret key, not the numbers.",
        "• Papers and scans are encrypted before they are stored, and only permitted staff can view them, inside the software. Each view of a passport or NID copy is written to the audit trail.",
        "• Each agency's data is walled off by the database's own rules.",
        "• A new device needs a code from the account's email. Five wrong passwords lock sign-in for 15 minutes.",
        "• Backups are made every day.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and what is kept on your device",
      body: [
        "Only cookies the software needs: the sign-in session (7 days), a trusted device (90 days), and one while a sign-in code is pending (10 minutes). Page scripts can't read them, and they are only sent over HTTPS.",
        "To work offline, the app keeps copies of public pages only (such as the guide book). No page or data behind sign-in is kept on the phone.",
      ],
    },
    {
      id: "retention",
      title: "How long it is kept",
      body: [
        "An agency's records are kept while it uses the software, or until the agency erases them.",
        "Sign-in records clear themselves: ended sessions are deleted, codes are deleted a day after they expire, and removed devices 30 days later.",
        "Files no record uses any more (a replaced logo, an erased paper) are deleted after a day.",
        "Backups are kept for 14 days, then deleted.",
      ],
    },
    {
      id: "rights",
      title: "Seeing, correcting and erasing your data",
      body: [
        "• Pilgrims, customers and employees: ask your agency. It can correct or permanently erase your details in the software: name, contact, addresses, passport and NID, papers, and their copies in the audit trail. The money record stays, by law, under its reference but without your name.",
        "• Staff: you can delete your own account on the \"My devices\" page. Your login is also erased when the agency removes you from its team.",
        "• Agency owners who want to close the agency and erase its data: contact us below.",
      ],
    },
    {
      id: "children",
      title: "Children",
      body: [
        "The software is for agencies. When a pilgrim is a child, the agency enters their details with a guardian's consent and is responsible for that. Anyone can read the guide book, which collects nothing.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: ["Changes are posted on this page with a new date."],
    },
  ],
};

export const POLICY = { bn, en } as const;
