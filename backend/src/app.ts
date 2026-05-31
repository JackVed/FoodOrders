import cookie from "@fastify/cookie";
import Fastify from "fastify";

import dbPlugin from "./plugins/db.js";
import envPlugin from "./plugins/env.js";
import authPlugin from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMenuRoutes } from "./routes/menu.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(envPlugin);
  app.register(cookie, {
    hook: "onRequest",
  });
  app.register(dbPlugin);
  app.register(authPlugin);

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

  return app;
}