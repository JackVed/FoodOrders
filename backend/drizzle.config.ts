import { defineConfig } from "drizzle-kit";

const port = Number.parseInt(process.env.DATABASE_PORT ?? "5432", 10);

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port,
    user: process.env.DATABASE_USER ?? "postgres",
    password: process.env.DATABASE_PASSWORD ?? "admin",
    database: process.env.DATABASE_NAME ?? "food_orders_db",
    ssl: (process.env.DATABASE_SSL ?? "false") === "true",
  },
  verbose: true,
  strict: true,
});