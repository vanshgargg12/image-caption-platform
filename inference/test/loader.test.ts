import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import {
  getLoadedModels,
  getOrLoad,
  loadedModels,
  loadWithCacheRecovery,
  recoverCorruptedModelCache,
  resetModelLoader,
  setModelPipelineForTesting,
} from "../src/model/loader.js";
import {
  getModelState,
  resetModelState,
  setModelStateForTesting,
} from "../src/model/state.js";
import { buildServer } from "../src/server.js";

describe("Model Loader Multi-Model Cache & State Tracking", () => {
  beforeEach(() => {
    resetModelLoader();
    resetModelState();
  });

  after(() => {
    resetModelLoader();
    resetModelState();
  });

  it("loading model A then model B keeps model A cached in loader map", async () => {
    let factoryACalls = 0;
    let factoryBCalls = 0;

    const modelA = { name: "model-pipeline-A", id: "modelA" };
    const modelB = {
      model: "florence2-core",
      processor: "florence2-proc",
      tokenizer: "florence2-tok",
    };

    // Load Model A
    const loadedA1 = await getOrLoad("modelA::main", async () => {
      factoryACalls++;
      return modelA;
    });

    // Load Model B (generic object/triple)
    const loadedB1 = await getOrLoad("modelB::main", async () => {
      factoryBCalls++;
      return modelB;
    });

    assert.equal(loadedA1, modelA);
    assert.equal(loadedB1, modelB);
    assert.equal(factoryACalls, 1);
    assert.equal(factoryBCalls, 1);

    // Load Model A again - must return cached promise without calling factory again
    const loadedA2 = await getOrLoad("modelA::main", async () => {
      factoryACalls++;
      return modelA;
    });

    assert.equal(loadedA2, modelA);
    assert.equal(factoryACalls, 1); // Not called again!

    // Verify both models are simultaneously present in loadedModels map
    assert.equal(getLoadedModels().has("modelA::main"), true);
    assert.equal(getLoadedModels().has("modelB::main"), true);
    assert.equal(getLoadedModels().size, 2);
  });

  it("recoverCorruptedModelCache cleans up only target model directory", () => {
    const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "recover-test-"));
    try {
      const targetDir = path.join(tmpCacheDir, "targetModel");
      const otherDir = path.join(tmpCacheDir, "otherModel");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.mkdirSync(otherDir, { recursive: true });

      const removed = recoverCorruptedModelCache("targetModel", tmpCacheDir);
      assert.equal(removed, true);
      assert.equal(fs.existsSync(targetDir), false);
      assert.equal(fs.existsSync(otherDir), true);
    } finally {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
    }
  });

  it("setModelPipelineForTesting resets loadedModels when null is passed", () => {
    setModelPipelineForTesting(async () => [{ generated_text: "test" }]);
    assert.equal(getLoadedModels().size, 0);
    setModelPipelineForTesting(null);
    assert.equal(getLoadedModels().size, 0);
  });

  it("model B failing to load deletes only its own entry and leaves model A ready and cached", async () => {
    const modelA = { id: "modelA", type: "vit-gpt2" };

    // Successfully load model A
    setModelStateForTesting(
      {
        loaded: true,
        loading: false,
        modelId: "Xenova/vit-gpt2-image-captioning",
        modelRevision: "main",
        error: null,
      },
      "Xenova/vit-gpt2-image-captioning"
    );

    await getOrLoad("Xenova/vit-gpt2-image-captioning::main", async () => modelA);

    assert.equal(loadedModels.has("Xenova/vit-gpt2-image-captioning::main"), true);
    assert.equal(getModelState("Xenova/vit-gpt2-image-captioning").loaded, true);
    assert.equal(getModelState().loaded, true);

    // Attempt to load model B which fails
    await assert.rejects(
      async () => {
        await getOrLoad("onnx-community/Florence-2-base-ft::main", async () => {
          setModelStateForTesting(
            {
              loaded: false,
              loading: false,
              modelId: "onnx-community/Florence-2-base-ft",
              modelRevision: "main",
              error: "Network failure loading Florence-2 weights",
            },
            "onnx-community/Florence-2-base-ft"
          );
          throw new Error("Network failure loading Florence-2 weights");
        });
      },
      /Network failure loading Florence-2/
    );

    // Model B entry should be deleted from loadedModels
    assert.equal(loadedModels.has("onnx-community/Florence-2-base-ft::main"), false);

    // Model A MUST still be cached in loadedModels and ready
    assert.equal(loadedModels.has("Xenova/vit-gpt2-image-captioning::main"), true);
    const stateA = getModelState("Xenova/vit-gpt2-image-captioning");
    assert.equal(stateA.loaded, true);
    assert.equal(stateA.error, null);

    // Default model state remains ready
    assert.equal(getModelState().loaded, true);
    assert.equal(getModelState().error, null);

    // Model B state correctly reflects failure without affecting Model A
    const stateB = getModelState("onnx-community/Florence-2-base-ft");
    assert.equal(stateB.loaded, false);
    assert.equal(stateB.error, "Network failure loading Florence-2 weights");
  });

  it("corrupted-cache retry only deletes its own model directory and leaves other models untouched", async () => {
    const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "corrupted-cache-test-"));

    try {
      const modelADir = path.join(tmpCacheDir, "modelA");
      const modelBDir = path.join(tmpCacheDir, "modelB");
      fs.mkdirSync(modelADir, { recursive: true });
      fs.mkdirSync(modelBDir, { recursive: true });

      const modelAFile = path.join(modelADir, "onnx_model.onnx");
      const modelBFile = path.join(modelBDir, "onnx_model.onnx");
      fs.writeFileSync(modelAFile, "valid-model-A-bytes");
      fs.writeFileSync(modelBFile, "corrupted-model-B-bytes");

      let attempts = 0;
      const loadedB = await loadWithCacheRecovery("modelB", tmpCacheDir, async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("Protobuf parsing failed: invalid tensor shape in modelB");
        }
        return { id: "modelB", recovered: true };
      });

      assert.deepEqual(loadedB, { id: "modelB", recovered: true });
      assert.equal(attempts, 2);

      // Model B cache directory was cleaned up during recovery
      assert.equal(fs.existsSync(modelBFile), false);

      // Model A cache directory MUST be completely untouched!
      assert.equal(fs.existsSync(modelADir), true);
      assert.equal(fs.existsSync(modelAFile), true);
      assert.equal(fs.readFileSync(modelAFile, "utf-8"), "valid-model-A-bytes");
    } finally {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
    }
  });

  it("GET /internal/ready reports READY when default model is loaded, listing all models under models", async () => {
    const app = await buildServer();

    try {
      // Default model is loaded
      setModelStateForTesting(
        { loaded: true, error: null },
        "Xenova/vit-gpt2-image-captioning"
      );

      // Secondary model is failed
      setModelStateForTesting(
        {
          loaded: false,
          loading: false,
          error: "Secondary model failed to load",
        },
        "onnx-community/Florence-2-base-ft"
      );

      const response = await app.inject({
        method: "GET",
        url: "/internal/ready",
      });

      assert.equal(response.statusCode, 200);

      const body = response.json<{
        status: string;
        service: string;
        model: { loaded: boolean; modelId: string };
        models: Array<{
          modelId: string;
          modelRevision: string;
          loaded: boolean;
          loading: boolean;
          error: string | null;
        }>;
      }>();

      assert.equal(body.status, "READY");
      assert.equal(body.service, "inference");
      assert.equal(body.model.loaded, true);
      assert.equal(body.model.modelId, "Xenova/vit-gpt2-image-captioning");

      // models lists state of every registered model
      assert.ok(Array.isArray(body.models));
      assert.equal(body.models.length >= 2, true);

      const vitState = body.models.find(
        (m) => m.modelId === "Xenova/vit-gpt2-image-captioning"
      );
      const florenceState = body.models.find(
        (m) => m.modelId === "onnx-community/Florence-2-base-ft"
      );

      assert.ok(vitState);
      assert.equal(vitState.loaded, true);
      assert.equal(vitState.error, null);

      assert.ok(florenceState);
      assert.equal(florenceState.loaded, false);
      assert.equal(florenceState.error, "Secondary model failed to load");
    } finally {
      await app.close();
    }
  });

  it("GET /internal/ready reports NOT_READY (503) when default model is not loaded", async () => {
    const app = await buildServer();

    try {
      setModelStateForTesting(
        { loaded: false, loading: false, error: "Model loading failed" },
        "Xenova/vit-gpt2-image-captioning"
      );

      const response = await app.inject({
        method: "GET",
        url: "/internal/ready",
      });

      assert.equal(response.statusCode, 503);

      const body = response.json<{
        status: string;
        model: { loaded: boolean; error: string | null };
        models: Array<{ modelId: string; loaded: boolean }>;
      }>();

      assert.equal(body.status, "NOT_READY");
      assert.equal(body.model.loaded, false);
      assert.ok(Array.isArray(body.models));
    } finally {
      await app.close();
    }
  });
});
