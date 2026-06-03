import { createHash, randomBytes } from "node:crypto";

export type UserRole = "admin" | "management" | "operator";

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
  sessionId: number;
}

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionExpiry(durationDays: number) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}