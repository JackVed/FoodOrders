import { migrate } from "drizzle-orm/postgres-js/migrator";

import { getConfig } from "../config/env.js";
import { createDbConnection } from "./client.js";

const config = getConfig();
const { db, sql } = createDbConnection(config);

try {
  await migrate(db, {
    migrationsFolder: "./drizzle",
  });
} finally {
  await sql.end();
}