import { migrate } from "drizzle-orm/postgres-js/migrator";

import { loadConfig } from "../config/env.js";
import { createDbConnection } from "./client.js";

const config = loadConfig();
const { db, sql } = createDbConnection(config);

try {
  await migrate(db, {
    migrationsFolder: "./drizzle",
  });
} finally {
  await sql.end();
}