import { and, eq, isNull } from "drizzle-orm";
import fp from "fastify-plugin";

import { sessions, users } from "../db/schema/index.js";
import { hashSessionToken, type AuthenticatedUser } from "../modules/auth/session.js";

const authPlugin = fp(async (app) => {
  app.decorateRequest("currentUser", null);

  app.decorate("getSessionUser", async (request) => {
    const rawToken = request.cookies[app.config.SESSION_COOKIE_NAME];

    if (!rawToken) {
      return null;
    }

    const sessionTokenHash = hashSessionToken(rawToken);
    const row = (
      await app.db
        .select({
          sessionId: sessions.id,
          expiresAt: sessions.expiresAt,
          revokedAt: sessions.revokedAt,
          userId: users.id,
          username: users.username,
          role: users.role,
          isEnabled: users.isEnabled,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionTokenHash, sessionTokenHash))
        .limit(1)
    )[0];

    if (!row) {
      return null;
    }

    const now = new Date();
    const sessionIsActive = row.revokedAt === null && row.expiresAt > now && row.isEnabled;

    if (!sessionIsActive) {
      if (row.revokedAt === null) {
        await app.db
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.id, row.sessionId), isNull(sessions.revokedAt)));
      }

      return null;
    }

    return {
      id: row.userId,
      username: row.username,
      role: row.role,
      sessionId: row.sessionId,
    } satisfies AuthenticatedUser;
  });

  app.decorate("authenticate", async (request, reply) => {
    const currentUser = await app.getSessionUser(request);
    request.currentUser = currentUser;

    if (currentUser) {
      return;
    }

    reply.clearCookie(app.config.SESSION_COOKIE_NAME, {
      path: "/",
    });
    reply.code(401).send({
      message: "Autenticazione richiesta.",
    });
  });
}, {
  name: "app-auth",
  dependencies: ["app-db"],
});

export default authPlugin;