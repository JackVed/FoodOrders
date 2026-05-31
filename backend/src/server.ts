import { buildApp } from "./app.js";

const app = buildApp();

async function start() {
  await app.ready();
  await app.listen({
    host: app.config.HOST,
    port: app.config.PORT,
  });
}

start().catch(async (error) => {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
});