import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type postgres from "postgres";

import type { AppConfig } from "../config/env.js";
import type { schema } from "../db/schema/index.js";
import type { AuthenticatedUser, UserRole } from "../modules/auth/session.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    db: PostgresJsDatabase<typeof schema>;
    sql: postgres.Sql;
    getSessionUser(request: FastifyRequest): Promise<AuthenticatedUser | null>;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    authorize(minimumRole: UserRole): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    currentUser: AuthenticatedUser | null;
  }
}