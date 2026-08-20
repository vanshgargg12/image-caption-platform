import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { Evaluator } from "../src/evaluator.js";
import { Reporter } from "../src/reporter.js";
import { ManifestItem } from "../src/types.js";

describe("Evaluation Package Tests", () => {
  const sampleItem: ManifestItem = {
    id: "test_001",
    source: "MS COCO",
    split: "val2017",
    imagePath: "samples/test_001.jpg",
    references: ["A cat sitting on a windowsill looking outside."],
    tags: ["cat", "windowsill"],
    textPresent: false,
    lowQuality: false,
    novelObject: false,
    expectedObjects: ["cat", "windowsill"],
    licenseReference: "CC-BY 4.0",
  };

  it("evaluateSample accurately assesses ground truth overlap and missing objects", () => {
    const result = Evaluator.evaluateSample(
      sampleItem,
      "a cat resting on a sunny windowsill",
      "onnx-community/Florence-2-base-ft",
      "main",
      "SHORT",
      210
    );

    assert.equal(result.id, "test_001");
    assert.equal(result.source, "MS COCO");
    assert.equal(result.failureStatus, false);
    assert.equal(result.missingObjects.length, 0);
    assert.ok(result.humanCorrectnessScore > 0.6);
  });

  it("evaluateSample flags missing objects when expected items are absent", () => {
    const result = Evaluator.evaluateSample(
      sampleItem,
      "a dog running outdoors",
      "Xenova/vit-gpt2-image-captioning",
      "main",
      "SHORT",
      150
    );

    assert.equal(result.missingObjects.length, 2);
    assert.ok(result.missingObjects.includes("cat"));
    assert.ok(result.missingObjects.includes("windowsill"));
    assert.ok(result.hallucinatedObjects.includes("dog"));
  });

  it("summarizeMetrics aggregates group scores by source and model", () => {
    const r1 = Evaluator.evaluateSample(
      sampleItem,
      "a cat sitting on a windowsill",
      "onnx-community/Florence-2-base-ft",
      "main",
      "SHORT",
      200
    );
    const r2 = Evaluator.evaluateSample(
      sampleItem,
      "a cat on a windowsill looking out",
      "onnx-community/Florence-2-base-ft",
      "main",
      "SHORT",
      220
    );

    const summaries = Evaluator.summarizeMetrics([r1, r2]);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].source, "MS COCO");
    assert.equal(summaries[0].model, "onnx-community/Florence-2-base-ft");
    assert.equal(summaries[0].totalSamples, 2);
    assert.equal(summaries[0].avgInferenceTimeMs, 210);
    assert.equal(summaries[0].successRate, 100);
  });
});
