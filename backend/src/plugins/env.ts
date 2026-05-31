import fp from "fastify-plugin";

import { loadConfig } from "../config/env.js";

const envPlugin = fp(async (app) => {
  const config = loadConfig();

  app.decorate("config", config);
}, {
  name: "app-env",
});

export default envPlugin;