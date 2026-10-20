import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// The repo's single .env (not committed) holds the connection; generating migrations needs no connection at all.
if (!process.env.DATABASE_OWNER_URL && existsSync("../../.env")) process.loadEnvFile("../../.env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  entities: { roles: { provider: "" } },
  dbCredentials: {
    url: process.env.DATABASE_OWNER_URL ?? "postgres://localhost:5440/hajj",
  },
});
