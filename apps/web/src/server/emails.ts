import "server-only";
import type { Mail } from "./mail";

/**
 * The one-time-code email, laid out like MY-Card's: brand mark, heading,
 * greeting, the code in a large box, a "didn't ask for this?" line and a
 * footer. Bangla first with English underneath, because the person reading
 * it may be either.
 */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

interface CodeEmail {
  to: string;
  name: string;
  code: string;
  purpose: "device" | "reset" | "signup";
  /** Shown for a new-device sign-in, e.g. "Desktop · Chrome · macOS". */
  device?: string;
  minutes: number;
}

const COPY = {
  device: {
    subject: (code: string) => `${code} — নতুন ডিভাইসে লগইনের কোড · your sign-in code`,
    headingBn: "নতুন ডিভাইস থেকে লগইন",
    headingEn: "Sign-in from a new device",
    bodyBn: (name: string, device: string, m: string) =>
      `আসসালামু আলাইকুম ${name}, একটি নতুন ডিভাইস${device ? ` (${device})` : ""} থেকে আপনার অ্যাকাউন্টে লগইনের চেষ্টা হয়েছে। লগইন শেষ করতে নিচের কোডটি দিন। কোডটি ${m} মিনিট কাজ করবে।`,
    bodyEn: (name: string, device: string, m: number) =>
      `Hi ${name}, someone is signing in to your account from a new device${device ? ` (${device})` : ""}. Enter the code below to finish signing in. It works for ${m} minutes.`,
  },
  signup: {
    subject: (code: string) => `${code} — ইমেইল যাচাইয়ের কোড · confirm your email`,
    headingBn: "ইমেইল যাচাই",
    headingEn: "Confirm your email",
    bodyBn: (name: string, _d: string, m: string) =>
      `আসসালামু আলাইকুম ${name}, হজ ট্র্যাকিং-এ অ্যাকাউন্ট খোলার জন্য ধন্যবাদ। ইমেইলটি আপনার, তা নিশ্চিত করতে নিচের কোডটি দিন। কোডটি ${m} মিনিট কাজ করবে।`,
    bodyEn: (name: string, _d: string, m: number) =>
      `Hi ${name}, thanks for opening a Hajj Tracking account. Enter the code below to confirm this email is yours. It works for ${m} minutes.`,
  },
  reset: {
    subject: (code: string) => `${code} — পাসওয়ার্ড রিসেটের কোড · your password reset code`,
    headingBn: "পাসওয়ার্ড রিসেট",
    headingEn: "Password reset",
    bodyBn: (name: string, _d: string, m: string) => `আসসালামু আলাইকুম ${name}, নতুন পাসওয়ার্ড দিতে নিচের কোডটি ব্যবহার করুন। কোডটি ${m} মিনিট কাজ করবে।`,
    bodyEn: (name: string, _d: string, m: number) => `Hi ${name}, use the code below to set a new password. It works for ${m} minutes.`,
  },
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = (s: string | number) => String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);

export function codeEmail({ to, name, code, purpose, device = "", minutes }: CodeEmail): Mail {
  const c = COPY[purpose];
  const who = escape(name || "");
  const dev = escape(device);
  const html = `
<div style="font-family:'Hind Siliguri','Noto Sans Bengali','Inter',system-ui,sans-serif;background:#0b1a19;padding:32px 16px;color:#f4efe6;">
  <div style="max-width:520px;margin:0 auto;background:#10201e;border:1px solid rgba(244,239,230,0.10);border-radius:20px;padding:32px 28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;">
      <div style="width:32px;height:36px;border-radius:16px 16px 6px 6px;background:#0b7a6f;"></div>
      <span style="font-weight:700;color:#f4efe6;font-size:1.1rem;">Hajj Tracking</span>
    </div>
    <h1 style="font-size:1.4rem;margin:0 0 4px;color:#f4efe6;line-height:1.35;">${c.headingBn}</h1>
    <p style="margin:0 0 16px;color:#a9bfba;font-size:0.95rem;">${c.headingEn}</p>
    <p style="color:#d8e3e0;line-height:1.65;margin:0 0 10px;">${c.bodyBn(who, dev, toBn(minutes))}</p>
    <p style="color:#a9bfba;line-height:1.6;margin:0 0 24px;font-size:0.92rem;">${c.bodyEn(who, dev, minutes)}</p>
    <div style="text-align:center;padding:20px;background:#0b1a19;border:1px solid rgba(242,179,61,0.40);border-radius:14px;margin-bottom:24px;">
      <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:2.6rem;font-weight:700;letter-spacing:0.4em;color:#f2b33d;">${escape(code)}</div>
    </div>
    <p style="color:#7f9590;font-size:0.85rem;line-height:1.55;margin:0;">
      আপনি এটি চাননি? তাহলে ইমেইলটি উপেক্ষা করুন — কোডটি ব্যবহার না হলে কিছুই বদলাবে না।<br>
      Didn't ask for this? You can safely ignore this email; nothing changes unless the code is used.
    </p>
    <hr style="border:none;border-top:1px solid rgba(244,239,230,0.08);margin:24px 0 16px;">
    <p style="color:#7f9590;font-size:0.75rem;margin:0;">Hajj Tracking · হজ ও ওমরা ব্যবস্থাপনা</p>
  </div>
</div>`;
  const text = [
    `${c.headingBn} / ${c.headingEn}`,
    "",
    c.bodyBn(name, device, toBn(minutes)),
    c.bodyEn(name, device, minutes),
    "",
    `Code: ${code}`,
    "",
    "Didn't ask for this? You can safely ignore this email.",
  ].join("\n");
  return { to, toName: name, subject: c.subject(code), html, text };
}

interface AlertEmail {
  to: string;
  name: string;
  kind: "device" | "password";
  device?: string;
  ip?: string;
  at: Date;
}

/** Sent after a new device is trusted or the password changes, so the owner knows if it wasn't them. */
export function alertEmail({ to, name, kind, device = "", ip = "", at }: AlertEmail): Mail {
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(at);
  const whenBn = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(at);
  const who = escape(name || "");
  const headingBn = kind === "device" ? "নতুন ডিভাইসে লগইন হয়েছে" : "আপনার পাসওয়ার্ড বদলানো হয়েছে";
  const headingEn = kind === "device" ? "A new device signed in" : "Your password was changed";
  const bodyBn =
    kind === "device"
      ? `আসসালামু আলাইকুম ${who}, ${escape(whenBn)} সময়ে একটি নতুন ডিভাইস${device ? ` (${escape(device)})` : ""} আপনার অ্যাকাউন্টে যুক্ত হয়েছে।`
      : `আসসালামু আলাইকুম ${who}, ${escape(whenBn)} সময়ে আপনার পাসওয়ার্ড বদলানো হয়েছে এবং অন্য সব ডিভাইস থেকে লগআউট করা হয়েছে।`;
  const bodyEn =
    kind === "device"
      ? `Hi ${who}, a new device${device ? ` (${escape(device)})` : ""} was added to your account on ${escape(when)}${ip ? ` from ${escape(ip)}` : ""}.`
      : `Hi ${who}, your password was changed on ${escape(when)} and every other device was signed out.`;
  const html = `
<div style="font-family:'Hind Siliguri','Noto Sans Bengali','Inter',system-ui,sans-serif;background:#0b1a19;padding:32px 16px;color:#f4efe6;">
  <div style="max-width:520px;margin:0 auto;background:#10201e;border:1px solid rgba(244,239,230,0.10);border-radius:20px;padding:32px 28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;">
      <div style="width:32px;height:36px;border-radius:16px 16px 6px 6px;background:#0b7a6f;"></div>
      <span style="font-weight:700;color:#f4efe6;font-size:1.1rem;">Hajj Tracking</span>
    </div>
    <h1 style="font-size:1.35rem;margin:0 0 4px;color:#f4efe6;">${headingBn}</h1>
    <p style="margin:0 0 16px;color:#a9bfba;font-size:0.95rem;">${headingEn}</p>
    <p style="color:#d8e3e0;line-height:1.65;margin:0 0 10px;">${bodyBn}</p>
    <p style="color:#a9bfba;line-height:1.6;margin:0 0 20px;font-size:0.92rem;">${bodyEn}</p>
    <p style="color:#f2b33d;line-height:1.6;margin:0;font-size:0.92rem;">
      এটা আপনি না হলে এখনই পাসওয়ার্ড বদলান এবং "আমার ডিভাইস" পাতা থেকে অচেনা ডিভাইস সরিয়ে দিন।<br>
      If this wasn't you, change your password now and remove unknown devices under "My devices".
    </p>
    <hr style="border:none;border-top:1px solid rgba(244,239,230,0.08);margin:24px 0 16px;">
    <p style="color:#7f9590;font-size:0.75rem;margin:0;">Hajj Tracking · হজ ও ওমরা ব্যবস্থাপনা</p>
  </div>
</div>`;
  const text = [`${headingBn} / ${headingEn}`, "", bodyEn, "", "If this wasn't you, change your password and remove unknown devices under My devices."].join("\n");
  return {
    to,
    toName: name,
    subject: kind === "device" ? "নতুন ডিভাইসে লগইন · New sign-in to your account" : "পাসওয়ার্ড বদলানো হয়েছে · Your password was changed",
    html,
    text,
  };
}
