/**
 * Which documents a pilgrim must hand in, and whether they are ready to be
 * finalised. Pure functions: the API and the apps share them.
 *
 * The default list follows common Bangladeshi Hajj and Umrah practice. Rules
 * change between seasons and agencies, so treat it as a starting point that an
 * agency confirms, not as legal advice.
 */

export type TripKind = "hajj" | "umrah";
export type Gender = "male" | "female";
export type DocumentStatus = "received" | "verified" | "rejected";

export interface Text {
  bn: string;
  en: string;
}

export type Condition = "adult" | "minor" | "female";

export interface DocumentType {
  code: string;
  name: Text;
  hint: Text;
  /** Trips this document is asked for. */
  for: TripKind[];
  /** Required to finalise; optional ones are collected when available. */
  required: boolean;
  /** Only asked when this holds for the pilgrim. */
  when?: Condition;
  /** Image only (shown as the pilgrim's photo), otherwise image or PDF. */
  imageOnly?: boolean;
  hasExpiry?: boolean;
}

export const DOCUMENT_TYPES: DocumentType[] = [
  {
    code: "photo",
    name: { bn: "সাম্প্রতিক ছবি", en: "Recent photo" },
    hint: { bn: "সাদা ব্যাকগ্রাউন্ডে মুখের সামনের দিকের ছবি", en: "Front-facing photo on a white background" },
    for: ["hajj", "umrah"],
    required: true,
    imageOnly: true,
  },
  {
    code: "passport",
    name: { bn: "পাসপোর্টের তথ্যের পাতা", en: "Passport data page" },
    hint: { bn: "ছবি আর MRZ লাইন দুটো পরিষ্কার দেখা যায় এমন", en: "Photo and both MRZ lines clearly readable" },
    for: ["hajj", "umrah"],
    required: true,
    hasExpiry: true,
  },
  {
    code: "nid",
    name: { bn: "জাতীয় পরিচয়পত্র (NID)", en: "National ID card" },
    hint: { bn: "সামনে ও পেছনের দুই পাশ", en: "Front and back" },
    for: ["hajj", "umrah"],
    required: true,
    when: "adult",
  },
  {
    code: "birth_certificate",
    name: { bn: "জন্ম নিবন্ধন সনদ", en: "Birth registration certificate" },
    hint: { bn: "১৮ বছরের কম বয়সীদের জন্য", en: "For pilgrims under 18" },
    for: ["hajj", "umrah"],
    required: true,
    when: "minor",
  },
  {
    code: "vaccination",
    name: { bn: "মেনিনজাইটিস (ACYW) টিকার সনদ", en: "Meningitis (ACYW) vaccination certificate" },
    hint: { bn: "সৌদি আরবে প্রবেশের জন্য প্রয়োজন", en: "Needed to enter Saudi Arabia" },
    for: ["hajj", "umrah"],
    required: true,
    hasExpiry: true,
  },
  {
    code: "medical",
    name: { bn: "স্বাস্থ্য পরীক্ষার সনদ", en: "Medical fitness certificate" },
    hint: { bn: "নিবন্ধিত চিকিৎসকের স্বাক্ষরসহ", en: "Signed by a registered doctor" },
    for: ["hajj"],
    required: true,
  },
  {
    code: "prp_slip",
    name: { bn: "প্রাক-নিবন্ধনের স্লিপ", en: "Pre-registration slip" },
    hint: { bn: "সরকারি হজ পোর্টালের ট্র্যাকিং নম্বরসহ", en: "With the government Hajj portal tracking number" },
    for: ["hajj"],
    required: true,
  },
  {
    code: "registration_slip",
    name: { bn: "চূড়ান্ত নিবন্ধন / ব্যাংক জমার রসিদ", en: "Final registration or bank deposit slip" },
    hint: { bn: "সরকারি নিবন্ধন সম্পন্ন হলে", en: "Once government registration is complete" },
    for: ["hajj"],
    required: false,
  },
  {
    code: "mahram_proof",
    name: { bn: "মাহরামের সম্পর্কের প্রমাণ", en: "Proof of mahram relationship" },
    hint: { bn: "যেমন বিবাহ সনদ বা জন্ম সনদ, প্রযোজ্য হলে", en: "e.g. marriage or birth certificate, where it applies" },
    for: ["hajj", "umrah"],
    required: false,
    when: "female",
  },
  {
    code: "other",
    name: { bn: "অন্যান্য কাগজ", en: "Other documents" },
    hint: { bn: "যেকোনো বাড়তি কাগজ", en: "Anything else" },
    for: ["hajj", "umrah"],
    required: false,
  },
];

const BY_CODE = new Map(DOCUMENT_TYPES.map((d) => [d.code, d]));

export function documentType(code: string): DocumentType | undefined {
  return BY_CODE.get(code);
}

/** Full years between a date of birth and a day, both ISO dates. */
export function ageOn(dateOfBirth: string, onIso: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number) as [number, number, number];
  const [y, m, d] = onIso.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export interface PilgrimFacts {
  kind: TripKind;
  gender?: Gender | null;
  dateOfBirth?: string | null;
}

/** Documents that apply to this pilgrim, in display order. Unknown age counts as adult. */
export function documentsFor(p: PilgrimFacts, todayIso: string): DocumentType[] {
  const age = p.dateOfBirth ? ageOn(p.dateOfBirth, todayIso) : null;
  const minor = age !== null && age < 18;
  return DOCUMENT_TYPES.filter((d) => {
    if (!d.for.includes(p.kind)) return false;
    if (d.when === "adult") return !minor;
    if (d.when === "minor") return minor;
    if (d.when === "female") return p.gender === "female";
    return true;
  });
}

export interface DocumentState {
  code: string;
  status: DocumentStatus;
  expiresOn?: string | null;
}

export type ReadinessIssue =
  | { kind: "document_missing"; code: string }
  | { kind: "document_unverified"; code: string }
  | { kind: "document_rejected"; code: string }
  | { kind: "document_expired"; code: string }
  | { kind: "passport_number_missing" }
  | { kind: "passport_validity"; expiry: string | null }
  | { kind: "payment_due"; due: number }
  | { kind: "prp_missing" };

export interface ReadinessInput extends PilgrimFacts {
  documents: DocumentState[];
  hasPassportNumber: boolean;
  passportExpiry?: string | null;
  /** Travel date if known; otherwise validity is checked against today. */
  travelDate?: string | null;
  due: number;
  prpNumber?: string | null;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

/**
 * Everything that stands between this pilgrim and "ready to travel". For each
 * required document, the newest upload counts.
 */
export function readiness(input: ReadinessInput, todayIso: string): { ready: boolean; issues: ReadinessIssue[] } {
  const issues: ReadinessIssue[] = [];
  const latest = new Map<string, DocumentState>();
  for (const d of input.documents) latest.set(d.code, d);

  for (const type of documentsFor(input, todayIso)) {
    if (!type.required) continue;
    const doc = latest.get(type.code);
    if (!doc) issues.push({ kind: "document_missing", code: type.code });
    else if (doc.status === "rejected") issues.push({ kind: "document_rejected", code: type.code });
    else if (doc.status !== "verified") issues.push({ kind: "document_unverified", code: type.code });
    else if (type.hasExpiry && doc.expiresOn && doc.expiresOn < todayIso) {
      issues.push({ kind: "document_expired", code: type.code });
    }
  }

  if (!input.hasPassportNumber) issues.push({ kind: "passport_number_missing" });
  const from = input.travelDate ?? todayIso;
  if (!input.passportExpiry || input.passportExpiry < addMonths(from, 6)) {
    issues.push({ kind: "passport_validity", expiry: input.passportExpiry ?? null });
  }
  if (input.due > 0) issues.push({ kind: "payment_due", due: input.due });
  if (input.kind === "hajj" && !input.prpNumber?.trim()) issues.push({ kind: "prp_missing" });

  return { ready: issues.length === 0, issues };
}
