import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

// Migrations run as the owner role; the app role never alters schema.
const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error("DATABASE_OWNER_URL is not set");

const sql = postgres(url, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
await sql.end();
console.info("Migrations applied");
