/**
 * Demo login and sample activity for the demo agency, so the office app has
 * something to show. Goes through the real HTTP API (receipt numbers, ledger,
 * encryption all happen as in normal use). Needs the web app running.
 *
 *   pnpm --filter @hajj/db seed:demo
 *
 * Every name and number here is invented.
 */
import postgres from "postgres";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3100";
const DEMO_ORG = "00000000-0000-4000-8000-00000000d3e0";
export const DEMO_EMAIL = "demo@baitullah.test";
export const DEMO_PASSWORD = "Demo-Hajj-2026";

let cookie = "";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", origin: BASE, cookie, ...(init.headers ?? {}) },
  });
  const set = res.headers.getSetCookie();
  if (set.length) {
    const jar = new Map(cookie.split("; ").filter(Boolean).map((c) => [c.split("=")[0]!, c] as const));
    for (const c of set) {
      const pair = c.split(";")[0]!;
      jar.set(pair.split("=")[0]!, pair);
    }
    cookie = [...jar.values()].join("; ");
  }
  return res;
}

async function trpc<T>(proc: string, input: unknown, kind: "mutation" | "query" = "mutation"): Promise<T> {
  const res =
    kind === "mutation"
      ? await call(`/api/trpc/${proc}`, { method: "POST", body: JSON.stringify({ json: input }) })
      : await call(`/api/trpc/${proc}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`);
  const body = (await res.json()) as { result?: { data: { json: T } }; error?: { json: { message: string } } };
  if (!res.ok || !body.result) throw new Error(`${proc}: ${body.error?.json.message ?? res.status}`);
  return body.result.data.json;
}

async function signIn() {
  cookie = "";
  const res = await call("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  return res.ok;
}

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) throw new Error("DATABASE_OWNER_URL is not set");
const sql = postgres(ownerUrl, { max: 1 });

// 1. A login for the demo agency's owner.
if (!(await signIn())) {
  const res = await call("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ name: "রহিম উদ্দিন", email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
}
const [user] = await sql<{ id: string }[]>`select id from "user" where email = ${DEMO_EMAIL}`;
await sql`
  insert into member (id, organization_id, user_id, role, created_at)
  select gen_random_uuid()::text, ${DEMO_ORG}, ${user!.id}, 'owner', now()
  where not exists (select 1 from member where organization_id = ${DEMO_ORG} and user_id = ${user!.id})`;
// Sign in again so the new session opens in the demo agency.
if (!(await signIn())) throw new Error("demo sign-in failed");

// 2. Sample activity, once.
const existing = await trpc<unknown[]>("pilgrims.list", {}, "query");
if (existing.length > 0) {
  console.info("Demo activity already present; login refreshed.");
} else {
  const packages = await trpc<{ id: string; kind: string; price: number }[]>("packages.list", { activeOnly: true }, "query");
  const hajj = packages.filter((p) => p.kind === "hajj");
  const umrah = packages.find((p) => p.kind === "umrah")!;

  const inquiries = [
    { name: "জাহিদ হাসান", phone: "01711-203040", interest: "hajj", partySize: 2, notes: "বাবা-মাকে নিয়ে যেতে চান, প্রিমিয়াম প্যাকেজের খরচ জানতে চেয়েছেন", followUpOn: undefined },
    { name: "নাসরিন আক্তার", phone: "01819-556677", interest: "umrah", partySize: 4, notes: "ডিসেম্বরে পরিবারের সাথে ওমরা", followUpOn: undefined },
    { name: "আবুল কালাম", phone: "01552-118899", interest: "hajj", partySize: 1, notes: "কিস্তিতে টাকা দেওয়া যাবে কিনা জানতে চেয়েছেন", followUpOn: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) },
    { name: "শাহানা পারভীন", phone: "01912-334455", interest: "umrah", partySize: 2, notes: "মাহরাম সংক্রান্ত নিয়ম জানতে চেয়েছেন", followUpOn: undefined },
    { name: "মো. রফিকুল ইসলাম", phone: "01677-990011", interest: "hajj", partySize: 3, notes: "গত বছর আমাদের সাথে ওমরা করেছেন", followUpOn: new Date().toISOString().slice(0, 10) },
  ];
  for (const iq of inquiries) await trpc("inquiries.create", iq);

  const people = [
    { fullName: "Md. Abdul Karim", phone: "01712-345678", pkg: hajj[1]!, discount: "10000", status: "visa", pays: [["200000", "cash"], ["150000", "bkash"], ["100000", "bank"]] },
    { fullName: "Rashida Begum", phone: "01815-223344", pkg: hajj[1]!, discount: undefined, status: "visa", pays: [["300000", "bank"], ["250000", "bank"]] },
    { fullName: "Hafez Nurul Islam", phone: "01920-778899", pkg: hajj[0]!, discount: undefined, status: "documents", pays: [["200000", "cash"]] },
    { fullName: "Mst. Salma Khatun", phone: "01611-445566", pkg: hajj[0]!, discount: "5000", status: "documents", pays: [["150000", "nagad"], ["100000", "cash"]] },
    { fullName: "Abu Taher Chowdhury", phone: "01712-998877", pkg: hajj[1]!, discount: undefined, status: "ready", pays: [["850000", "bank"]] },
    { fullName: "Kamrun Nahar", phone: "01833-667788", pkg: umrah, discount: undefined, status: "ready", pays: [["145000", "bkash"]] },
    { fullName: "Mizanur Rahman", phone: "01755-112233", pkg: umrah, discount: undefined, status: "documents", pays: [["70000", "cash"]] },
    { fullName: "Golam Mostafa", phone: "01990-445511", pkg: hajj[0]!, discount: undefined, status: "registered", pays: [] },
  ] as const;

  let trx = 1000;
  for (const [i, p] of people.entries()) {
    const created = await trpc<{ id: string }>("pilgrims.create", {
      fullName: p.fullName,
      phone: p.phone,
      packageId: p.pkg.id,
      discount: p.discount,
      passportNumber: `DM${String(1000001 + i)}`,
      passportExpiry: "2031-06-30",
      gender: p.fullName.startsWith("Mst.") || ["Rashida Begum", "Kamrun Nahar"].includes(p.fullName) ? "female" : "male",
      district: ["ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী"][i % 4],
    });
    for (const [amount, method] of p.pays) {
      await trpc("payments.receive", {
        pilgrimId: created.id,
        amount,
        method,
        reference: method === "cash" ? undefined : `DEMO${trx++}`,
        purpose: undefined,
      });
    }
    // Demo pilgrims have no papers uploaded, so final statuses go through the owner's override.
    await trpc("pilgrims.setStatus", {
      id: created.id,
      status: p.status,
      overrideReason: p.status === "ready" ? "ডেমো ডেটা: কাগজপত্র আপলোড করা হয়নি" : undefined,
    });
  }
  console.info(`Demo activity added: ${inquiries.length} inquiries, ${people.length} pilgrims.`);
}

// 3. Starter guide articles (drafts), skipped if already there.
const { added } = await trpc<{ added: number }>("articles.addStarter", undefined);
if (added) console.info(`Added ${added} starter guide articles.`);

await sql.end();
console.info(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}  →  ${BASE}/sign-in`);
