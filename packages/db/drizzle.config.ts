import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  entities: { roles: { provider: "" } },
  dbCredentials: {
    url: process.env.DATABASE_OWNER_URL ?? "postgres://hajj_owner:hajj_owner_dev@localhost:5440/hajj",
  },
});
