import { integer, timestamp } from "drizzle-orm/pg-core";

export function identityId() {
  return integer("id").primaryKey().generatedAlwaysAsIdentity();
}

export function createdAtColumn(name = "created_at") {
  return timestamp(name, { withTimezone: true }).notNull().defaultNow();
}

export function updatedAtColumn(name = "updated_at") {
  return timestamp(name, { withTimezone: true }).notNull().defaultNow();
}