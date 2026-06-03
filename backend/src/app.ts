import cors from "@fastify/cors";
import { lt } from "drizzle-orm";
import cookie from "@fastify/cookie";
import Fastify from "fastify";

import { sessions } from "./db/schema/index.js";
import dbPlugin from "./plugins/db.js";
import envPlugin from "./plugins/env.js";
import authPlugin from "./plugins/auth.js";
import { registerKitchenTicketRoutes } from "./routes/kitchen-tickets.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerManagementRoutes } from "./routes/management.js";
import { registerMenuRoutes } from "./routes/menu.js";
import { registerOrderRoutes } from "./routes/orders.js";
import { registerUserRoutes } from "./routes/users.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });
  let sessionCleanupTimer: NodeJS.Timeout | null = null;

  app.register(envPlugin);
  app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (app.config.CORS_ORIGINS.length === 0) {
        callback(null, app.config.NODE_ENV !== "production");
        return;
      }

      callback(null, app.config.CORS_ORIGINS.includes(origin));
    },
  });
  app.register(cookie, {
    hook: "onRequest",
  });
  app.register(dbPlugin);
  app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (reply.sent) {
      return;
    }

    reply.code(500).send({
      message: "Errore interno del server.",
    });
  });

  app.addHook("onReady", async () => {
    const cleanupExpiredSessions = async () => {
      const deletedRows = await app.db
        .delete(sessions)
        .where(lt(sessions.expiresAt, new Date()))
        .returning({ id: sessions.id });

      if (deletedRows.length > 0) {
        app.log.info({ deletedSessions: deletedRows.length }, "Expired sessions cleaned up.");
      }
    };

    await cleanupExpiredSessions();
    sessionCleanupTimer = setInterval(() => {
      void cleanupExpiredSessions().catch((error) => {
        app.log.error(error, "Failed to clean up expired sessions.");
      });
    }, app.config.SESSION_CLEANUP_INTERVAL_MINUTES * 60_000);
    sessionCleanupTimer.unref();
  });

  app.addHook("onClose", async () => {
    if (sessionCleanupTimer) {
      clearInterval(sessionCleanupTimer);
      sessionCleanupTimer = null;
    }
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.register(registerAuthRoutes, {
    prefix: "/api/auth",
  });
  app.register(registerMenuRoutes, {
    prefix: "/api",
  });
  app.register(registerUserRoutes, {
    prefix: "/api",
  });
  app.register(registerOrderRoutes, {
    prefix: "/api",
  });
  app.register(registerKitchenTicketRoutes, {
    prefix: "/api",
  });
  app.register(registerManagementRoutes, {
    prefix: "/api/management",
  });

  return app;
}