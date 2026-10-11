/**
 * Small helpers for sign-in security: a readable name for the device someone
 * signs in from, and an email address shown with most of it hidden.
 */

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "";

export interface DeviceInfo {
  deviceType: DeviceType;
  browser: string;
  os: string;
  /** "Desktop · Chrome · macOS" */
  label: string;
}

const BROWSERS: [RegExp, string][] = [
  [/\bEdgA?\/|\bEdg\//, "Edge"],
  [/\bOPR\/|\bOpera\b/, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\bFirefox\/|\bFxiOS\//, "Firefox"],
  [/\bCriOS\/|\bChrome\/|HeadlessChrome\//, "Chrome"],
  [/\bVersion\/[\d.]+.*Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/\biPhone\b|\biPad\b|\biPod\b/, "iOS"],
  [/\bAndroid\b/, "Android"],
  [/\bWindows NT\b/, "Windows"],
  [/\bMac OS X\b|\bMacintosh\b/, "macOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bLinux\b/, "Linux"],
];

export function describeDevice(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? "";
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1] ?? "";
  const os = SYSTEMS.find(([re]) => re.test(ua))?.[1] ?? "";
  let deviceType: DeviceType = "";
  if (/bot|crawler|spider|curl|wget|python-requests/i.test(ua)) deviceType = "bot";
  else if (/\biPad\b|\bTablet\b/i.test(ua) || (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua))) deviceType = "tablet";
  else if (/\bMobile\b|\biPhone\b|\biPod\b/.test(ua)) deviceType = "mobile";
  else if (ua) deviceType = "desktop";
  const kind = deviceType ? deviceType[0]!.toUpperCase() + deviceType.slice(1) : "";
  const label = [kind, browser, os].filter(Boolean).join(" · ") || "Unknown device";
  return { deviceType, browser, os, label };
}

/** "sh•••••••3@gmail.com", the way the email is shown before a code is typed. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const masked = local.length <= 3 ? local[0] + "•".repeat(Math.max(local.length - 1, 1)) : local.slice(0, 2) + "•".repeat(local.length - 3) + local.slice(-1);
  return `${masked}@${domain}`;
}
