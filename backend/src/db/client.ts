import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { AppConfig } from "../config/env.js";
import { schema } from "./schema/index.js";

export interface DbConnection {
  db: PostgresJsDatabase<typeof schema>;
  sql: postgres.Sql;
}

export function createDbConnection(config: AppConfig): DbConnection {
  const options: postgres.Options<Record<string, never>> = {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME,
    max: 10,
  };

  if (config.DATABASE_SSL) {
    options.ssl = "require";
  }

  const sql = postgres(options);

  const db = drizzle(sql, { schema });

  return {
    db,
    sql,
  };
}