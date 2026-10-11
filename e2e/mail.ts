import fs from "node:fs";
import path from "node:path";

/** Emails the app wrote with MAIL_TRANSPORT=file (see apps/web/src/server/mail.ts). */
function dir() {
  if (process.env.MAIL_OUTBOX_DIR) return process.env.MAIL_OUTBOX_DIR;
  // Locally the app reads the root .env; use the same folder it does.
  const env = path.join(__dirname, "..", ".env");
  const line = fs.existsSync(env) ? fs.readFileSync(env, "utf8").split("\n").find((l) => l.startsWith("MAIL_OUTBOX_DIR=")) : undefined;
  return line ? line.slice("MAIL_OUTBOX_DIR=".length).trim() : path.join(__dirname, "..", "apps", "web", ".mail-outbox");
}

export async function waitForMail(to: string, after: Date, match = /^\d{6}/, timeoutMs = 15_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const files = fs.existsSync(dir()) ? fs.readdirSync(dir()).filter((f) => f.endsWith(".json")).sort().reverse() : [];
    for (const f of files) {
      const m = JSON.parse(fs.readFileSync(path.join(dir(), f), "utf8")) as { to: string; subject: string; sentAt: string };
      if (m.to === to && new Date(m.sentAt) > after && match.test(m.subject)) return m;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email to ${to} matching ${match}`);
}

export async function waitForCode(to: string, after: Date) {
  return (await waitForMail(to, after)).subject.slice(0, 6);
}
