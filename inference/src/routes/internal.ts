import type { FastifyInstance } from "fastify";
import { getModelState } from "../model/state.js";

export async function registerInternalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/internal/health", async () => ({
    status: "UP",
    service: "inference",
  }));

  app.get("/internal/ready", async () => {
    const model = getModelState();

    return {
      status: model.loaded ? "READY" : "NOT_READY",
      service: "inference",
      model: {
        loaded: model.loaded,
        modelId: model.modelId,
        modelRevision: model.modelRevision,
      },
    };
  });
}
