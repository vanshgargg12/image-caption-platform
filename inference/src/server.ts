import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { registerInternalRoutes } from "./routes/internal.js";

export async function buildServer() {
  const app = Fastify({ logger: false });
  await registerInternalRoutes(app);
  return app;
}

async function start() {
  const config = loadConfig();
  const app = await buildServer();

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
