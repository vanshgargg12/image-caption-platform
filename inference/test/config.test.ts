import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns default values when environment variables are not set", () => {
    delete process.env.INFERENCE_PORT;
    delete process.env.MODEL_ID;
    delete process.env.MODEL_REVISION;
    delete process.env.MODEL_CACHE_DIR;

    const config = loadConfig();

    assert.equal(config.port, 3001);
    assert.equal(config.modelId, "Xenova/vit-gpt2-image-captioning");
    assert.equal(config.modelRevision, "main");
    assert.equal(config.modelCacheDir, ".model-cache");
  });

  it("respects custom environment variables", () => {
    process.env.INFERENCE_PORT = "4000";
    process.env.MODEL_ID = "custom/model-id";
    process.env.MODEL_REVISION = "v1.0.0";
    process.env.MODEL_CACHE_DIR = "/tmp/custom-cache";

    const config = loadConfig();

    assert.equal(config.port, 4000);
    assert.equal(config.modelId, "custom/model-id");
    assert.equal(config.modelRevision, "v1.0.0");
    assert.equal(config.modelCacheDir, "/tmp/custom-cache");
  });

  it("throws an error if INFERENCE_PORT is invalid", () => {
    process.env.INFERENCE_PORT = "-5";
    assert.throws(() => loadConfig(), /INFERENCE_PORT must be a positive integer/);

    process.env.INFERENCE_PORT = "abc";
    assert.throws(() => loadConfig(), /INFERENCE_PORT must be a positive integer/);
  });
});
