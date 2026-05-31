import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sessions, users } from "../db/schema/index.js";
import { verifyPassword } from "../modules/auth/password.js";
import { buildSessionExpiry, generateSessionToken, hashSessionToken } from "../modules/auth/session.js";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function sessionCookieOptions(app: FastifyInstance, expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: app.config.NODE_ENV === "production",
    expires: expiresAt,
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const parsedBody = loginSchema.safeParse(request.body);

    if (!parsedBody.success) {
      reply.code(400).send({
        message: "Payload non valido.",
        issues: parsedBody.error.flatten(),
      });
      return;
    }

    const credentials = parsedBody.data;
    const user = (
      await app.db
        .select({
          id: users.id,
          username: users.username,
          passwordHash: users.passwordHash,
          role: users.role,
          isEnabled: users.isEnabled,
        })
        .from(users)
        .where(eq(users.username, credentials.username))
        .limit(1)
    )[0];

    if (!user || !user.isEnabled) {
      reply.code(401).send({
        message: "Credenziali non valide.",
      });
      return;
    }

    const passwordMatches = await verifyPassword(user.passwordHash, credentials.password);

    if (!passwordMatches) {
      reply.code(401).send({
        message: "Credenziali non valide.",
      });
      return;
    }

    const sessionToken = generateSessionToken();
    const expiresAt = buildSessionExpiry(app.config.SESSION_DURATION_DAYS);

    const insertedSession = (
      await app.db
        .insert(sessions)
        .values({
          userId: user.id,
          sessionTokenHash: hashSessionToken(sessionToken),
          expiresAt,
          userAgent: request.headers["user-agent"] ?? null,
          ipAddress: request.ip,
        })
        .returning({ id: sessions.id })
    )[0];

    if (!insertedSession) {
      throw new Error("Failed to create session.");
    }

    reply.setCookie(
      app.config.SESSION_COOKIE_NAME,
      sessionToken,
      sessionCookieOptions(app, expiresAt),
    );

    reply.send({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        sessionId: insertedSession.id,
      },
    });
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    return {
      user: request.currentUser,
    };
  });

  app.post("/logout", async (request, reply) => {
    const rawToken = request.cookies[app.config.SESSION_COOKIE_NAME];

    if (rawToken) {
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.sessionTokenHash, hashSessionToken(rawToken)),
            isNull(sessions.revokedAt),
          ),
        );
    }

    reply.clearCookie(app.config.SESSION_COOKIE_NAME, {
      path: "/",
    });
    reply.code(204).send();
  });
}