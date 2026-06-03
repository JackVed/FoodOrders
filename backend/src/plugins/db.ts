import fp from "fastify-plugin";

import { createDbConnection } from "../db/client.js";

const dbPlugin = fp(async (app) => {
  const { db, sql } = createDbConnection(app.config);

  app.decorate("db", db);
  app.decorate("sql", sql);

  app.addHook("onClose", async () => {
    await sql.end();
  });
}, {
  name: "app-db",
  dependencies: ["app-env"],
});

export default dbPlugin;