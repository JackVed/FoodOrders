import { buildApp } from "./app.js";

const app = buildApp();

async function start() {
  await app.listen({
    host: "0.0.0.0",
    port: 3000,
  });
}

start().catch(async (error) => {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
});