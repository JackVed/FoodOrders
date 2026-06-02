import { defineConfig } from "drizzle-kit";
import { getConfig } from "./src/config/env.js";

const config = getConfig();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME,
    ssl: config.DATABASE_SSL,
  },
  verbose: true,
  strict: true,
});