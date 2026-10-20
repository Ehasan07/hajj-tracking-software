import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Transactional email. In production it goes through ZeptoMail (the same
 * service MY-Card uses). For local work and the browser tests,
 * MAIL_TRANSPORT=file writes each message to MAIL_OUTBOX_DIR instead, where
 * the dev outbox page and the tests can read it.
 */

export interface Mail {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

export interface StoredMail extends Mail {
  id: string;
  sentAt: string;
}

const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.com/v1.1/email";

/**
 * The file outbox shows sign-in codes to anyone who opens /dev/mail, so it
 * only works when the app's own address is this machine. A copied example
 * .env on a real server leaves email off instead of publishing codes.
 */
function localOnly(): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.BETTER_AUTH_URL ?? "").hostname);
  } catch {
    return false;
  }
}

let fileRefusedLogged = false;

function transport(): "zeptomail" | "file" | null {
  if (process.env.MAIL_TRANSPORT === "file") {
    if (localOnly()) return "file";
    if (!fileRefusedLogged) {
      console.warn("MAIL_TRANSPORT=file is ignored because BETTER_AUTH_URL is not a local address");
      fileRefusedLogged = true;
    }
  }
  if (process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_FROM_ADDRESS) return "zeptomail";
  return null;
}

/** Whether email can be sent at all. Features that need it switch themselves off when it can't. */
export function mailConfigured(): boolean {
  return transport() !== null;
}

export function outboxEnabled(): boolean {
  return transport() === "file";
}

function outboxDir(): string {
  return process.env.MAIL_OUTBOX_DIR || path.join(process.cwd(), ".mail-outbox");
}

export async function sendMail(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const via = transport();
  if (via === "file") {
    const dir = outboxDir();
    await mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const stored: StoredMail = { ...mail, id, sentAt: new Date().toISOString() };
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify(stored, null, 2));
    return { ok: true };
  }
  if (via === "zeptomail") {
    try {
      const res = await fetch(ZEPTOMAIL_URL, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", authorization: process.env.ZEPTOMAIL_TOKEN! },
        body: JSON.stringify({
          from: { address: process.env.ZEPTOMAIL_FROM_ADDRESS, name: process.env.ZEPTOMAIL_FROM_NAME || "Hajj Tracking" },
          to: [{ email_address: { address: mail.to, name: mail.toName ?? "" } }],
          subject: mail.subject,
          htmlbody: mail.html,
          textbody: mail.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.warn(`ZeptoMail returned ${res.status} for ${mail.to}: ${(await res.text()).slice(0, 200)}`);
        return { ok: false, error: `email service returned ${res.status}` };
      }
      return { ok: true };
    } catch (error) {
      console.warn(`ZeptoMail send failed for ${mail.to}:`, error);
      return { ok: false, error: "email service unavailable" };
    }
  }
  console.warn(`No mail transport configured; email to ${mail.to} not sent`);
  return { ok: false, error: "email not configured" };
}

/** Newest first. Only meaningful with MAIL_TRANSPORT=file. */
export async function readOutbox(limit = 30): Promise<StoredMail[]> {
  if (!outboxEnabled()) return [];
  const dir = outboxDir();
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json") && !f.startsWith("sms-")).sort().reverse().slice(0, limit);
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoredMail));
}
