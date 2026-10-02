/**
 * Make an existing user a platform admin (they must have signed up first).
 *
 *   pnpm --filter @hajj/db platform:admin someone@example.com
 */
import postgres from "postgres";

const email = process.argv[2];
if (!email) throw new Error("Usage: platform:admin <email>");
const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error("DATABASE_OWNER_URL is not set");
const sql = postgres(url, { max: 1 });
const rows = await sql`
  insert into platform_admins (user_id)
  select id from "user" where lower(email) = lower(${email})
  on conflict do nothing
  returning user_id`;
const [exists] = await sql`select 1 from "user" where lower(email) = lower(${email})`;
await sql.end();
if (!exists) throw new Error(`No user with email ${email}. Sign up first.`);
console.info(rows.length ? `${email} is now a platform admin.` : `${email} was already a platform admin.`);
