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
    assert.equal(config.generation.maxNewTokens, 24);
    assert.equal(config.generation.numBeams, 4);
    assert.equal(config.generation.noRepeatNgramSize, 3);
    assert.equal(config.generation.repetitionPenalty, 1.0);
  });

  it("respects custom environment variables", () => {
    process.env.INFERENCE_PORT = "4000";
    process.env.MODEL_ID = "custom/model-id";
    process.env.MODEL_REVISION = "v1.0.0";
    process.env.MODEL_CACHE_DIR = "/tmp/custom-cache";
    process.env.CAPTION_MAX_NEW_TOKENS = "36";
    process.env.CAPTION_NUM_BEAMS = "2";
    process.env.CAPTION_NO_REPEAT_NGRAM = "4";
    process.env.CAPTION_REPETITION_PENALTY = "1.5";

    const config = loadConfig();

    assert.equal(config.port, 4000);
    assert.equal(config.modelId, "custom/model-id");
    assert.equal(config.modelRevision, "v1.0.0");
    assert.equal(config.modelCacheDir, "/tmp/custom-cache");
    assert.equal(config.generation.maxNewTokens, 36);
    assert.equal(config.generation.numBeams, 2);
    assert.equal(config.generation.noRepeatNgramSize, 4);
    assert.equal(config.generation.repetitionPenalty, 1.5);
  });

  it("throws an error if INFERENCE_PORT is invalid", () => {
    process.env.INFERENCE_PORT = "-5";
    assert.throws(() => loadConfig(), /INFERENCE_PORT must be a positive integer/);

    process.env.INFERENCE_PORT = "abc";
    assert.throws(() => loadConfig(), /INFERENCE_PORT must be a positive integer/);
  });

  it("throws an error if CAPTION_MAX_NEW_TOKENS is invalid", () => {
    process.env.CAPTION_MAX_NEW_TOKENS = "-1";
    assert.throws(() => loadConfig(), /CAPTION_MAX_NEW_TOKENS must be a positive integer/);

    process.env.CAPTION_MAX_NEW_TOKENS = "abc";
    assert.throws(() => loadConfig(), /CAPTION_MAX_NEW_TOKENS must be a positive integer/);
  });

  it("throws an error if CAPTION_NUM_BEAMS is invalid", () => {
    process.env.CAPTION_NUM_BEAMS = "0";
    assert.throws(() => loadConfig(), /CAPTION_NUM_BEAMS must be a positive integer/);

    process.env.CAPTION_NUM_BEAMS = "xyz";
    assert.throws(() => loadConfig(), /CAPTION_NUM_BEAMS must be a positive integer/);
  });

  it("throws an error if CAPTION_NO_REPEAT_NGRAM is invalid", () => {
    process.env.CAPTION_NO_REPEAT_NGRAM = "-3";
    assert.throws(() => loadConfig(), /CAPTION_NO_REPEAT_NGRAM must be a positive integer/);

    process.env.CAPTION_NO_REPEAT_NGRAM = "invalid";
    assert.throws(() => loadConfig(), /CAPTION_NO_REPEAT_NGRAM must be a positive integer/);
  });

  it("throws an error if CAPTION_REPETITION_PENALTY is invalid", () => {
    process.env.CAPTION_REPETITION_PENALTY = "0";
    assert.throws(() => loadConfig(), /CAPTION_REPETITION_PENALTY must be a positive number/);

    process.env.CAPTION_REPETITION_PENALTY = "-1.5";
    assert.throws(() => loadConfig(), /CAPTION_REPETITION_PENALTY must be a positive number/);

    process.env.CAPTION_REPETITION_PENALTY = "abc";
    assert.throws(() => loadConfig(), /CAPTION_REPETITION_PENALTY must be a positive number/);
  });
});
