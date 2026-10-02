import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const globalForDb = globalThis as unknown as { __hajjSql?: postgres.Sql };

/**
 * Runtime connection as the restricted `hajj_app` role. Row level security
 * applies to every tenant table queried through this client.
 */
const sql =
  globalForDb.__hajjSql ??
  postgres(requireEnv("DATABASE_URL"), {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__hajjSql = sql;

export const db: Database = drizzle(sql, { schema, casing: "snake_case" });

export { schema, sql as rawSql };
export * from "./tenant";
