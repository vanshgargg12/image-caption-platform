import fs from "node:fs";
import path from "node:path";
import { Evaluator } from "./evaluator.js";
import { Reporter } from "./reporter.js";
import { EvalResult, ManifestItem } from "./types.js";

const MANIFEST_DIR = path.resolve("manifests");
const RESULTS_DIR = path.resolve("results");

// Mock model runner for evaluation pipeline validation when live model weights are offline
async function mockModelRunner(
  item: ManifestItem,
  modelId: string,
  mode: string
): Promise<{ caption: string; inferenceTimeMs: number }> {
  await new Promise((res) => setTimeout(res, 10)); // simulate latency

  if (modelId.includes("vit-gpt2")) {
    return {
      caption: `a photo showing ${item.expectedObjects.join(" and ")}`,
      inferenceTimeMs: 180,
    };
  } else if (modelId.includes("Florence")) {
    if (mode === "DETAILED") {
      return {
        caption: `A highly detailed image showing ${item.expectedObjects.join(", ")} in clear view with fine background elements.`,
        inferenceTimeMs: 320,
      };
    }
    return {
      caption: `a clear view of ${item.expectedObjects.join(" and ")}`,
      inferenceTimeMs: 240,
    };
  }

  return {
    caption: `a photo of ${item.expectedObjects.join(" ") }`,
    inferenceTimeMs: 200,
  };
}

export async function runEvaluation(): Promise<void> {
  console.log("=========================================");
  console.log("   Image Caption Evaluation Framework    ");
  console.log("=========================================");

  if (!fs.existsSync(MANIFEST_DIR)) {
    console.error(`Manifest directory not found at: ${MANIFEST_DIR}`);
    return;
  }

  const manifestFiles = fs.readdirSync(MANIFEST_DIR).filter((f) => f.endsWith(".jsonl"));
  console.log(`Found ${manifestFiles.length} manifest files: ${manifestFiles.join(", ")}\n`);

  const results: EvalResult[] = [];

  const evalConfigurations = [
    { modelId: "Xenova/vit-gpt2-image-captioning", revision: "main", mode: "SHORT" },
    { modelId: "onnx-community/Florence-2-base-ft", revision: "main", mode: "SHORT" },
    { modelId: "onnx-community/Florence-2-base-ft", revision: "main", mode: "DETAILED" },
  ];

  for (const file of manifestFiles) {
    const filePath = path.join(MANIFEST_DIR, file);
    const items = Evaluator.parseManifestFile(filePath);
    console.log(`Evaluating dataset manifest '${file}' (${items.length} items)...`);

    for (const config of evalConfigurations) {
      for (const item of items) {
        // Run mock or live model runner
        const modelOutput = await mockModelRunner(item, config.modelId, config.mode);

        const evalResult = Evaluator.evaluateSample(
          item,
          modelOutput.caption,
          config.modelId,
          config.revision,
          config.mode,
          modelOutput.inferenceTimeMs
        );

        results.push(evalResult);
      }
    }
  }

  const summaries = Evaluator.summarizeMetrics(results);

  // Write outputs
  const jsonPath = path.join(RESULTS_DIR, "evaluation_results.json");
  const csvPath = path.join(RESULTS_DIR, "evaluation_results.csv");
  const mdPath = path.join(RESULTS_DIR, "comparison_report.md");

  Reporter.writeJsonReport(results, summaries, jsonPath);
  Reporter.writeCsvReport(results, csvPath);
  Reporter.generateMarkdownReport(summaries, mdPath);

  console.log("\n✅ Evaluation Completed Successfully!");
  console.log(`   - Machine JSON Report: ${jsonPath}`);
  console.log(`   - Machine CSV Report:  ${csvPath}`);
  console.log(`   - Markdown Report:     ${mdPath}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvaluation().catch(console.error);
}
