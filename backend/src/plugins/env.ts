import fp from "fastify-plugin";

import { getConfig } from "../config/env.js";

const envPlugin = fp(async (app) => {
  const config = getConfig();

  app.decorate("config", config);
}, {
  name: "app-env",
});

export default envPlugin;