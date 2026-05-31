import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAtColumn, identityId, updatedAtColumn } from "./common.js";
import { userRoleEnum } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: identityId(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("operator"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("users_username_key").on(table.username),
    index("users_is_enabled_idx").on(table.isEnabled),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: identityId(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("sessions_session_token_hash_key").on(table.sessionTokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);