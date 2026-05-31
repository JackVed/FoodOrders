import { and, asc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema, sessions, users } from "../../db/schema/index.js";
import { hashPassword } from "../auth/password.js";
import type { UserRole } from "../auth/session.js";

type Database = PostgresJsDatabase<typeof schema>;
type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DatabaseClient = Database | DatabaseTransaction;

export interface UserRecord {
  id: number;
  username: string;
  role: UserRole;
  isEnabled: boolean;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  username?: string;
  role?: UserRole;
  isEnabled?: boolean;
}

function userSelection() {
  return {
    id: users.id,
    username: users.username,
    role: users.role,
    isEnabled: users.isEnabled,
    disabledAt: users.disabledAt,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };
}

export async function listUsers(db: DatabaseClient) {
  return db
    .select(userSelection())
    .from(users)
    .orderBy(asc(users.username));
}

export async function getUserById(db: DatabaseClient, userId: number) {
  return (
    await db
      .select(userSelection())
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0] ?? null;
}

export async function createUser(db: DatabaseClient, input: CreateUserInput) {
  const passwordHash = await hashPassword(input.password);

  return (
    await db
      .insert(users)
      .values({
        username: input.username,
        passwordHash,
        role: input.role,
        isEnabled: true,
        disabledAt: null,
      })
      .returning(userSelection())
  )[0] ?? null;
}

export async function updateUser(db: DatabaseClient, userId: number, updates: UpdateUserInput, updatedAt: Date) {
  return (
    await db
      .update(users)
      .set({
        ...(updates.username !== undefined ? { username: updates.username } : {}),
        ...(updates.role !== undefined ? { role: updates.role } : {}),
        ...(updates.isEnabled !== undefined
          ? {
              isEnabled: updates.isEnabled,
              disabledAt: updates.isEnabled ? null : updatedAt,
            }
          : {}),
        updatedAt,
      })
      .where(eq(users.id, userId))
      .returning(userSelection())
  )[0] ?? null;
}

export async function setUserPassword(db: DatabaseClient, userId: number, password: string, updatedAt: Date) {
  const passwordHash = await hashPassword(password);

  return (
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt,
      })
      .where(eq(users.id, userId))
      .returning(userSelection())
  )[0] ?? null;
}

export async function revokeActiveSessionsForUser(db: DatabaseClient, userId: number, revokedAt: Date) {
  const revokedSessions = await db
    .update(sessions)
    .set({ revokedAt })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });

  return revokedSessions.length;
}