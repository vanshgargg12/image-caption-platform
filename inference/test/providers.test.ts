import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModelRegistry } from "../src/model/providers/modelRegistry.js";
import { VitGpt2CaptionModel } from "../src/model/providers/vitGpt2Provider.js";
import { Florence2CaptionModel } from "../src/model/providers/florence2Provider.js";
import { UnsupportedModeError } from "../src/model/providers/types.js";

describe("CaptionModel Provider Abstraction & Registry", () => {
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
