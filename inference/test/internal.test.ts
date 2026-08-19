import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

describe("internal routes", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer();
  });

  after(async () => {
    await app.close();
  });

  it("GET /internal/health returns UP", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/internal/health",
    });

    assert.equal(response.statusCode, 200);

    const body = response.json<{ status: string; service: string }>();
    assert.equal(body.status, "UP");
    assert.equal(body.service, "inference");
  });

  it("GET /internal/ready reports no model loaded yet", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/internal/ready",
    });

    assert.equal(response.statusCode, 503);

    const body = response.json<{
      status: string;
      service: string;
      model: {
        loaded: boolean;
        modelId: string;
        modelRevision: string;
      };
    }>();

    assert.equal(body.status, "NOT_READY");
    assert.equal(body.service, "inference");
    assert.equal(body.model.loaded, false);
    assert.equal(body.model.modelId, "Xenova/vit-gpt2-image-captioning");
    assert.equal(body.model.modelRevision, "main");
  });
});
