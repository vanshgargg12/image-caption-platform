import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { loadConfig } from "./config.js";
import { registerInternalRoutes } from "./routes/internal.js";
import { initializeModel } from "./model/state.js";

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({
    logger: false,
    requestIdHeader: "x-request-id",
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxImageSizeBytes,
    },
  });

  await registerInternalRoutes(app);

  // Trigger controlled model preload on buildServer
  initializeModel(config).catch((err) => {
    console.error("Failed to pre-load model on service startup:", err);
  });

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
