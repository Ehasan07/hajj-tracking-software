/**
 * Settings the app can't run safely without. In production a missing or
 * placeholder value stops the server at start-up, with the names (never the
 * values) of what is wrong, instead of failing on some later request or, worse,
 * quietly running with a security check switched off.
 */

const PLACEHOLDERS = new Set(["", "change-me", "changeme", "secret", "password", "example"]);

function key32(name: string): string | null {
  const value = process.env[name] ?? "";
  if (PLACEHOLDERS.has(value)) return `${name} is not set`;
  return Buffer.from(value, "base64").length === 32 ? null : `${name} must be 32 bytes, base64 (openssl rand -base64 32)`;
}

export function productionEnvProblems(): string[] {
  const problems: string[] = [];
  const required = ["DATABASE_URL", "BETTER_AUTH_URL", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"];
  for (const name of required) if (PLACEHOLDERS.has(process.env[name] ?? "")) problems.push(`${name} is not set`);

  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  if (PLACEHOLDERS.has(secret) || secret.length < 32) problems.push("BETTER_AUTH_SECRET must be at least 32 random characters (openssl rand -base64 32)");

  for (const name of ["FIELD_ENCRYPTION_KEY", "BLIND_INDEX_KEY"]) {
    const problem = key32(name);
    if (problem) problems.push(problem);
  }

  try {
    const url = new URL(process.env.BETTER_AUTH_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !local) problems.push("BETTER_AUTH_URL must be https");
    // The new-device email code is a sign-in safeguard: without email it would switch itself
    // off, so on a real server that has to be chosen on purpose (DEVICE_CHECK=off).
    const mail = (process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_FROM_ADDRESS) || (local && process.env.MAIL_TRANSPORT === "file");
    if (!local && !mail && process.env.DEVICE_CHECK !== "off") {
      problems.push("ZEPTOMAIL_TOKEN and ZEPTOMAIL_FROM_ADDRESS are needed for sign-in codes (or set DEVICE_CHECK=off on purpose)");
    }
  } catch {
    // Reported above as not set.
  }
  return problems;
}
