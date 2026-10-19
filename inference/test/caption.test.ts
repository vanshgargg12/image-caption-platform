import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { generateCaption } from "../src/model/caption.js";
import { setModelPipelineForTesting } from "../src/model/loader.js";
import { CaptionGenerationError, CaptionResult } from "../src/model/types.js";

describe("generateCaption (mocked model test)", () => {
  let tmpDir: string;
  let sampleJpegPath: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-caption-test-"));
    sampleJpegPath = path.join(tmpDir, "test.jpg");
    // Valid JPEG header
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    fs.writeFileSync(sampleJpegPath, jpegHeader);
  });

  after(() => {
    setModelPipelineForTesting(null);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    setModelPipelineForTesting(null);
  });

  it("successfully generates a caption using a mocked model pipeline without network calls", async () => {
    let calledParams: unknown = null;
    let callCount = 0;

    const mockPipe = async (imgPath: string, params: unknown) => {
      callCount++;
      calledParams = params;
      return [{ generated_text: "a mock caption of a test image" }];
    };

    setModelPipelineForTesting(mockPipe);

    const result: CaptionResult = await generateCaption(sampleJpegPath, {
      config: {
        modelId: "Xenova/vit-gpt2-image-captioning",
        modelRevision: "main",
        modelCacheDir: ".model-cache",
      },
    });

    assert.equal(result.caption, "a mock caption of a test image");
    assert.equal(result.model, "Xenova/vit-gpt2-image-captioning");
    assert.equal(result.modelVersion, "main");
    assert.equal(result.input, path.resolve(sampleJpegPath));
    assert.equal(typeof result.inferenceTimeMs, "number");
    assert.equal(typeof result.modelLoadTimeMs, "number");
    assert.equal(callCount, 1);
    assert.deepEqual(calledParams, {
      max_new_tokens: 24,
      num_beams: 4,
      no_repeat_ngram_size: 3,
      repetition_penalty: 1.0,
      do_sample: false,
    });
  });

  it("allows per-request options to override generation settings", async () => {
    let calledParams: unknown = null;

    const mockPipe = async (_imgPath: string, params: unknown) => {
      calledParams = params;
      return [{ generated_text: "custom options caption" }];
    };

    setModelPipelineForTesting(mockPipe);

    await generateCaption(sampleJpegPath, {
      maxNewTokens: 16,
      numBeams: 2,
      noRepeatNgramSize: 2,
      repetitionPenalty: 1.2,
      doSample: true,
    });

    assert.deepEqual(calledParams, {
      max_new_tokens: 16,
      num_beams: 2,
      no_repeat_ngram_size: 2,
      repetition_penalty: 1.2,
      do_sample: true,
    });
  });

  it("reuses the singleton model loader across multiple generateCaption calls", async () => {
    let callCount = 0;

    const mockPipe = async () => {
      callCount++;
      return [{ generated_text: "reused pipeline caption" }];
    };

    setModelPipelineForTesting(mockPipe);

    const result1 = await generateCaption(sampleJpegPath);
    const result2 = await generateCaption(sampleJpegPath);

    assert.equal(result1.caption, "reused pipeline caption");
    assert.equal(result2.caption, "reused pipeline caption");
    assert.equal(callCount, 2); // Pipeline function invoked twice, but loader model promise created once
  });

  it("throws CaptionGenerationError if the model pipeline throws an inference error", async () => {
    const failingPipe = async () => {
      throw new Error("CUDA / ONNX execution context error");
    };

    setModelPipelineForTesting(failingPipe);

    await assert.rejects(
      () => generateCaption(sampleJpegPath),
      (err: unknown) => {
        assert.ok(err instanceof CaptionGenerationError);
        assert.match(err.message, /Inference failed/);
        assert.match(err.message, /ONNX execution context error/);
        return true;
      }
    );
  });
});
