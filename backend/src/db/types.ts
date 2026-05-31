import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema } from "./schema/index.js";

export type Database = PostgresJsDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseClient = Database | DatabaseTransaction;