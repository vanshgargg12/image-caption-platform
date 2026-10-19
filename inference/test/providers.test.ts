import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { setModelPipelineForTesting } from "../src/model/loader.js";
import { ModelRegistry } from "../src/model/providers/modelRegistry.js";
import { VitGpt2CaptionModel } from "../src/model/providers/vitGpt2Provider.js";
import { Florence2CaptionModel } from "../src/model/providers/florence2Provider.js";
import { UnsupportedModeError } from "../src/model/providers/types.js";

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

  it("Florence2CaptionModel supports SHORT, DETAILED, OCR, OD, and REGION_DESCRIPTIONS", () => {
    const model = new Florence2CaptionModel();
    assert.equal(model.id, "onnx-community/Florence-2-base-ft");
    assert.equal(model.revision, "main");
    assert.equal(model.supportsMode("SHORT"), true);
    assert.equal(model.supportsMode("DETAILED"), true);
    assert.equal(model.supportsMode("OCR"), true);
    assert.equal(model.supportsMode("OBJECT_DETECTION"), true);
    assert.equal(model.supportsMode("REGION_DESCRIPTIONS"), true);
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
