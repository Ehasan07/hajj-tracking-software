import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Sending SMS. One Bangladeshi gateway is chosen with SMS_PROVIDER
 * (bulksmsbd, sslwireless or alphasms) and its SMS_API_KEY / SMS_SENDER_ID.
 * For local work and the browser tests, SMS_TRANSPORT=file writes each
 * message to the outbox folder instead (shown at /dev/mail), and only when
 * the app's own address is this machine.
 *
 * The three gateway calls follow each provider's published HTTP API; each
 * needs one real send to confirm once an account exists.
 */

export interface SmsResult {
  ok: boolean;
  ref?: string;
  error?: string;
}

export interface StoredSms {
  id: string;
  kind: "sms";
  to: string;
  text: string;
  sentAt: string;
}

type Provider = "bulksmsbd" | "sslwireless" | "alphasms";

function localOnly(): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.BETTER_AUTH_URL ?? "").hostname);
  } catch {
    return false;
  }
}

function transport(): Provider | "file" | null {
  const provider = process.env.SMS_PROVIDER as Provider | undefined;
  if (provider && ["bulksmsbd", "sslwireless", "alphasms"].includes(provider) && process.env.SMS_API_KEY) return provider;
  if (process.env.SMS_TRANSPORT === "file" && localOnly()) return "file";
  return null;
}

export function smsConfigured(): boolean {
  return transport() !== null;
}

function outboxDir(): string {
  return process.env.SMS_OUTBOX_DIR || process.env.MAIL_OUTBOX_DIR || path.join(process.cwd(), ".mail-outbox");
}

/** +8801712345678 → 8801712345678, the form the gateways expect. */
const msisdn = (to: string) => to.replace(/^\+/, "");

async function post(url: string, body: BodyInit, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: "POST", body, headers, signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* some gateways answer in plain text */
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const via = transport();
  if (!via) return { ok: false, error: "SMS is not set up" };
  if (!/^\+8801[3-9]\d{8}$/.test(to)) return { ok: false, error: "not a Bangladeshi mobile number" };
  try {
    if (via === "file") {
      const dir = outboxDir();
      await mkdir(dir, { recursive: true });
      const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
      const stored: StoredSms = { id, kind: "sms", to, text, sentAt: new Date().toISOString() };
      await writeFile(path.join(dir, `sms-${id}.json`), JSON.stringify(stored, null, 2));
      return { ok: true, ref: id };
    }
    const key = process.env.SMS_API_KEY!;
    const sender = process.env.SMS_SENDER_ID ?? "";
    if (via === "bulksmsbd") {
      const r = await post("https://bulksmsbd.net/api/smsapi", new URLSearchParams({ api_key: key, type: "text", number: msisdn(to), senderid: sender, message: text }));
      const code = Number(r.json.response_code);
      return code === 202 ? { ok: true, ref: String(r.json.message_id ?? "") } : { ok: false, error: `bulksmsbd ${code || r.status}: ${String(r.json.error_message ?? r.text)}` };
    }
    if (via === "sslwireless") {
      const csmsId = randomBytes(8).toString("hex").slice(0, 16);
      const r = await post(
        "https://smsplus.sslwireless.com/api/v3/send-sms",
        JSON.stringify({ api_token: key, sid: sender, msisdn: msisdn(to), sms: text, csms_id: csmsId }),
        { "content-type": "application/json", accept: "application/json" },
      );
      return r.json.status === "SUCCESS" ? { ok: true, ref: csmsId } : { ok: false, error: `sslwireless ${r.status}: ${String(r.json.error_message ?? r.text)}` };
    }
    const form = new URLSearchParams({ api_key: key, msg: text, to: msisdn(to) });
    if (sender) form.set("sender_id", sender);
    const r = await post("https://api.sms.net.bd/sendsms", form);
    const data = r.json.data as { request_id?: unknown } | undefined;
    return Number(r.json.error) === 0 ? { ok: true, ref: String(data?.request_id ?? "") } : { ok: false, error: `alphasms ${String(r.json.error ?? r.status)}: ${String(r.json.msg ?? r.text)}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "send failed" };
  }
}

/** Newest first; only with SMS_TRANSPORT=file. */
export async function readSmsOutbox(limit = 30): Promise<StoredSms[]> {
  if (transport() !== "file") return [];
  const dir = outboxDir();
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.startsWith("sms-") && f.endsWith(".json")).sort().reverse().slice(0, limit);
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoredSms));
}
