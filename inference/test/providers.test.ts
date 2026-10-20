import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { setModelPipelineForTesting } from "../src/model/loader.js";
import { ModelRegistry } from "../src/model/providers/modelRegistry.js";
import { VitGpt2CaptionModel } from "../src/model/providers/vitGpt2Provider.js";
import {
  Florence2CaptionModel,
  setFlorence2ModelForTesting,
} from "../src/model/providers/florence2Provider.js";
import { UnsupportedModeError } from "../src/model/providers/types.js";
import { CaptionGenerationError } from "../src/model/types.js";

describe("CaptionModel Provider Abstraction & Registry", () => {
  it("VitGpt2CaptionModel passes configured generation parameters to pipeline", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vitgpt2-prov-test-"));
    const imgPath = path.join(tmpDir, "test.jpg");
    fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]));

    let calledParams: unknown = null;
    setModelPipelineForTesting(async (_path: string, params: unknown) => {
      calledParams = params;
      return [{ generated_text: "provider caption" }];
    });

    try {
      const model = new VitGpt2CaptionModel();
      await model.generate(imgPath, "SHORT");

      assert.deepEqual(calledParams, {
        max_new_tokens: 24,
        num_beams: 4,
        no_repeat_ngram_size: 3,
        repetition_penalty: 1.0,
        do_sample: false,
      });

      // Override via options
      await model.generate(imgPath, "SHORT", {
        maxNewTokens: 18,
        numBeams: 2,
        noRepeatNgramSize: 2,
        repetitionPenalty: 1.3,
        doSample: true,
      });

      assert.deepEqual(calledParams, {
        max_new_tokens: 18,
        num_beams: 2,
        no_repeat_ngram_size: 2,
        repetition_penalty: 1.3,
        do_sample: true,
      });
    } finally {
      setModelPipelineForTesting(null);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("VitGpt2CaptionModel supports SHORT mode and rejects DETAILED mode", () => {
    const model = new VitGpt2CaptionModel();
    assert.equal(model.id, "Xenova/vit-gpt2-image-captioning");
    assert.equal(model.revision, "main");
    assert.equal(model.supportsMode("SHORT"), true);
    assert.equal(model.supportsMode("DETAILED"), false);
    assert.equal(model.supportsMode("OCR"), false);
  });

  it("Florence2CaptionModel supports SHORT, DETAILED, and OCR modes, and rejects unsupported modes", () => {
    const model = new Florence2CaptionModel();
    assert.equal(model.id, "onnx-community/Florence-2-base-ft");
    assert.equal(model.revision, "main");
    assert.equal(model.supportsMode("SHORT"), true);
    assert.equal(model.supportsMode("DETAILED"), true);
    assert.equal(model.supportsMode("OCR"), true);
    assert.equal(model.supportsMode("OBJECT_DETECTION"), false);
    assert.equal(model.supportsMode("REGION_DESCRIPTIONS"), false);
  });

  it("Florence2CaptionModel throws UnsupportedModeError for unsupported modes", async () => {
    const model = new Florence2CaptionModel();
    await assert.rejects(
      async () => model.generate("/tmp/nonexistent.jpg", "OBJECT_DETECTION"),
      (err: unknown) => {
        return (
          err instanceof UnsupportedModeError &&
          err.code === "UNSUPPORTED_CAPTION_MODE" &&
          err.message.includes("does not support caption mode 'OBJECT_DETECTION'")
        );
      }
    );

    await assert.rejects(
      async () => model.generate("/tmp/nonexistent.jpg", "REGION_DESCRIPTIONS"),
      (err: unknown) => {
        return (
          err instanceof UnsupportedModeError &&
          err.code === "UNSUPPORTED_CAPTION_MODE" &&
          err.message.includes("does not support caption mode 'REGION_DESCRIPTIONS'")
        );
      }
    );
  });

  it("Florence2CaptionModel executes SHORT captioning with default parameters and post-processing", async () => {
    const fixturePath = path.resolve("test/fixtures/sample.jpg");
    let capturedGenerateArgs: Record<string, unknown> | null = null;
    let capturedDecodeArgs: Record<string, unknown> | null = null;
    let capturedPostProcessArgs: Record<string, unknown> | null = null;
    let capturedPrompt: string | null = null;

    setFlorence2ModelForTesting({
      processor: Object.assign(
        async () => ({ pixel_values: [1, 2, 3] }),
        {
          construct_prompts: (task: string) => {
            capturedPrompt = task;
            return [task];
          },
          post_process_generation: (text: string, task: string, size: [number, number]) => {
            capturedPostProcessArgs = { text, task, size };
            return { [task]: text };
          },
        }
      ),
      tokenizer: Object.assign(
        () => ({ input_ids: [100] }),
        {
          batch_decode: (ids: unknown, opts: unknown) => {
            capturedDecodeArgs = { ids, opts };
            return ["<s><CAPTION>a cute cat cat on a green mat mat.</s>"];
          },
        }
      ),
      model: {
        generate: async (args: Record<string, unknown>) => {
          capturedGenerateArgs = args;
          return [42];
        },
      },
    });

    try {
      const model = new Florence2CaptionModel();
      const result = await model.generate(fixturePath, "SHORT");

      assert.equal(capturedPrompt, "<CAPTION>");
      assert.deepEqual(capturedDecodeArgs, {
        ids: [42],
        opts: { skip_special_tokens: false },
      });
      assert.ok(capturedPostProcessArgs);
      assert.equal(capturedPostProcessArgs.task, "<CAPTION>");
      assert.ok(capturedGenerateArgs);
      assert.equal(capturedGenerateArgs.max_new_tokens, 40);
      assert.equal(capturedGenerateArgs.num_beams, 3);
      assert.deepEqual(capturedGenerateArgs.pixel_values, [1, 2, 3]);
      assert.deepEqual(capturedGenerateArgs.input_ids, [100]);

      // Assert post-processing cleaned the caption and stripped task prompt
      assert.equal(result.caption, "A cute cat on a green mat.");
      assert.equal(result.mode, "SHORT");
      assert.equal(result.model, "onnx-community/Florence-2-base-ft");
      assert.equal(result.details?.taskPrompt, "<CAPTION>");
    } finally {
      setFlorence2ModelForTesting(null);
    }
  });

  it("Florence2CaptionModel executes DETAILED mode with 120 default max_new_tokens and stripped task token", async () => {
    const fixturePath = path.resolve("test/fixtures/sample.jpg");
    let capturedGenerateArgs: Record<string, unknown> | null = null;
    let capturedPrompt: string | null = null;

    setFlorence2ModelForTesting({
      processor: Object.assign(
        async () => ({ pixel_values: [5, 6] }),
        {
          construct_prompts: (task: string) => {
            capturedPrompt = task;
            return [task];
          },
          post_process_generation: (text: string, task: string) => {
            return { [task]: text };
          },
        }
      ),
      tokenizer: Object.assign(
        () => ({ input_ids: [200] }),
        {
          batch_decode: () => ["<MORE_DETAILED_CAPTION>a detailed view of a beautiful landscape with trees."],
        }
      ),
      model: {
        generate: async (args: Record<string, unknown>) => {
          capturedGenerateArgs = args;
          return [99];
        },
      },
    });

    try {
      const model = new Florence2CaptionModel();
      const result = await model.generate(fixturePath, "DETAILED");

      assert.equal(capturedPrompt, "<MORE_DETAILED_CAPTION>");
      assert.ok(capturedGenerateArgs);
      assert.equal(capturedGenerateArgs.max_new_tokens, 120);
      assert.equal(capturedGenerateArgs.num_beams, 3);
      assert.equal(result.caption, "A detailed view of a beautiful landscape with trees.");
      assert.equal(result.mode, "DETAILED");
      assert.equal(result.details?.taskPrompt, "<MORE_DETAILED_CAPTION>");
    } finally {
      setFlorence2ModelForTesting(null);
    }
  });

  it("Florence2CaptionModel executes OCR mode and formats label output", async () => {
    const fixturePath = path.resolve("test/fixtures/sample.jpg");
    let capturedPrompt: string | null = null;

    setFlorence2ModelForTesting({
      processor: Object.assign(
        async () => ({ pixel_values: [7] }),
        {
          construct_prompts: (task: string) => {
            capturedPrompt = task;
            return [task];
          },
          post_process_generation: (_text: string, task: string) => {
            return {
              [task]: {
                labels: ["NO", "PARKING", "ANY", "TIME"],
                quad_boxes: [[0, 0, 10, 10, 10, 20, 0, 20]],
              },
            };
          },
        }
      ),
      tokenizer: Object.assign(
        () => ({ input_ids: [300] }),
        {
          batch_decode: () => ["<OCR>NO<loc_0><loc_0>PARKING<loc_10><loc_10>"],
        }
      ),
      model: {
        generate: async () => [123],
      },
    });

    try {
      const model = new Florence2CaptionModel();
      const result = await model.generate(fixturePath, "OCR");

      assert.equal(capturedPrompt, "<OCR>");
      assert.equal(result.caption, "NO PARKING ANY TIME");
      assert.equal(result.mode, "OCR");
    } finally {
      setFlorence2ModelForTesting(null);
    }
  });

  it("Florence2CaptionModel respects per-request generation options overrides", async () => {
    const fixturePath = path.resolve("test/fixtures/sample.jpg");
    let capturedGenerateArgs: Record<string, unknown> | null = null;

    setFlorence2ModelForTesting({
      processor: Object.assign(
        async () => ({ pixel_values: [1] }),
        {
          construct_prompts: (task: string) => [task],
          post_process_generation: (text: string, task: string) => ({ [task]: text }),
        }
      ),
      tokenizer: Object.assign(
        () => ({ input_ids: [1] }),
        {
          batch_decode: () => ["a sample caption"],
        }
      ),
      model: {
        generate: async (args: Record<string, unknown>) => {
          capturedGenerateArgs = args;
          return [1];
        },
      },
    });

    try {
      const model = new Florence2CaptionModel();
      await model.generate(fixturePath, "SHORT", {
        maxNewTokens: 64,
        numBeams: 5,
        doSample: true,
        noRepeatNgramSize: 2,
        repetitionPenalty: 1.2,
      });

      assert.ok(capturedGenerateArgs);
      assert.equal(capturedGenerateArgs.max_new_tokens, 64);
      assert.equal(capturedGenerateArgs.num_beams, 5);
      assert.equal(capturedGenerateArgs.do_sample, true);
      assert.equal(capturedGenerateArgs.no_repeat_ngram_size, 2);
      assert.equal(capturedGenerateArgs.repetition_penalty, 1.2);
    } finally {
      setFlorence2ModelForTesting(null);
    }
  });

  it("Florence2CaptionModel throws CaptionGenerationError when model inference fails", async () => {
    const fixturePath = path.resolve("test/fixtures/sample.jpg");

    setFlorence2ModelForTesting({
      processor: Object.assign(
        async () => ({ pixel_values: [1] }),
        {
          construct_prompts: (task: string) => [task],
          post_process_generation: (text: string, task: string) => ({ [task]: text }),
        }
      ),
      tokenizer: Object.assign(
        () => ({ input_ids: [1] }),
        {
          batch_decode: () => ["failed"],
        }
      ),
      model: {
        generate: async () => {
          throw new Error("Device out of memory during generation");
        },
      },
    });

    try {
      const model = new Florence2CaptionModel();
      await assert.rejects(
        async () => model.generate(fixturePath, "SHORT"),
        (err: unknown) => {
          return (
            err instanceof CaptionGenerationError &&
            err.message.includes("Inference failed for image") &&
            err.message.includes("Device out of memory")
          );
        }
      );
    } finally {
      setFlorence2ModelForTesting(null);
    }
  });

  it("VitGpt2CaptionModel throws UnsupportedModeError when invoked with unsupported DETAILED mode", async () => {
    const model = new VitGpt2CaptionModel();
    await assert.rejects(
      async () => model.generate("/tmp/nonexistent.jpg", "DETAILED"),
      (err: unknown) => {
        return (
          err instanceof UnsupportedModeError &&
          err.code === "UNSUPPORTED_CAPTION_MODE" &&
          err.message.includes("does not support caption mode 'DETAILED'")
        );
      }
    );
  });

  it("ModelRegistry registers and resolves models by ID and friendly aliases", () => {
    const registry = ModelRegistry.getInstance();

    const vitGpt2 = registry.getModel("Xenova/vit-gpt2-image-captioning");
    assert.equal(vitGpt2.id, "Xenova/vit-gpt2-image-captioning");

    const vitAlias = registry.getModel("vit-gpt2");
    assert.equal(vitAlias.id, "Xenova/vit-gpt2-image-captioning");

    const florence2 = registry.getModel("onnx-community/Florence-2-base-ft");
    assert.equal(florence2.id, "onnx-community/Florence-2-base-ft");

    const florenceAlias = registry.getModel("florence-2");
    assert.equal(florenceAlias.id, "onnx-community/Florence-2-base-ft");
  });

  it("ModelRegistry lists registered models and capabilities", () => {
    const registry = ModelRegistry.getInstance();
    const modelsList = registry.listModels();

    assert.equal(modelsList.length, 2);
    const vitInfo = modelsList.find((m) => m.id === "Xenova/vit-gpt2-image-captioning");
    assert.ok(vitInfo);
    assert.deepEqual(vitInfo.capabilities, ["SHORT"]);

    const florenceInfo = modelsList.find((m) => m.id === "onnx-community/Florence-2-base-ft");
    assert.ok(florenceInfo);
    assert.ok(florenceInfo.capabilities.includes("SHORT"));
    assert.ok(florenceInfo.capabilities.includes("DETAILED"));
  });
});
