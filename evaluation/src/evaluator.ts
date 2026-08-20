import fs from "node:fs";
import path from "node:path";
import { BaselineReference, DatasetMetricsSummary, EvalResult, ManifestItem } from "./types.js";

export type ModelGeneratorFn = (
  imagePath: string,
  mode: string,
  modelId: string
) => Promise<{ caption: string; inferenceTimeMs: number; failureStatus?: boolean }>;

export class Evaluator {
  public static parseManifestFile(filePath: string): ManifestItem[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => JSON.parse(line) as ManifestItem);
  }

  public static evaluateSample(
    item: ManifestItem,
    generatedCaption: string,
    modelId: string,
    modelRevision: string,
    captionMode: string,
    inferenceTimeMs: number,
    failureStatus = false
  ): EvalResult {
    if (failureStatus || !generatedCaption) {
      return {
        id: item.id,
        source: item.source,
        imagePath: item.imagePath,
        model: modelId,
        modelRevision,
        captionMode,
        generatedCaption: "",
        inferenceTimeMs,
        failureStatus: true,
        humanCorrectnessScore: 0.0,
        missingObjects: item.expectedObjects,
        hallucinatedObjects: [],
        grammarScore: 0.0,
        notes: "Inference failed or returned empty caption.",
      };
    }

    const captionLower = generatedCaption.toLowerCase();

    // Check missing and hallucinated objects
    const missingObjects = item.expectedObjects.filter(
      (obj) => !captionLower.includes(obj.toLowerCase())
    );

    // Simple heuristic for hallucinated objects
    const commonObjects = ["cat", "dog", "car", "bird", "person", "chair", "table", "laptop", "phone"];
    const hallucinatedObjects = commonObjects.filter(
      (obj) => captionLower.includes(obj) && !item.expectedObjects.map((e) => e.toLowerCase()).includes(obj)
    );

    // Compute basic word overlap / human correctness score against references
    const textWords = new Set(captionLower.replace(/[^\w\s]/g, "").split(/\s+/));
    let maxOverlapRatio = 0.0;

    for (const ref of item.references) {
      const refWords = new Set(ref.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/));
      const intersection = new Set([...textWords].filter((w) => refWords.has(w)));
      const union = new Set([...textWords, ...refWords]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0.0;
      if (jaccard > maxOverlapRatio) {
        maxOverlapRatio = jaccard;
      }
    }

    // Scale Jaccard overlap to 0.5 - 1.0 baseline for valid sentences
    const humanCorrectnessScore = Math.min(1.0, Math.round((0.5 + maxOverlapRatio * 0.5) * 100) / 100);
    const grammarScore = captionLower.length > 5 && captionLower.includes(" ") ? 0.95 : 0.60;

    return {
      id: item.id,
      source: item.source,
      imagePath: item.imagePath,
      model: modelId,
      modelRevision,
      captionMode,
      generatedCaption,
      inferenceTimeMs,
      failureStatus: false,
      humanCorrectnessScore,
      missingObjects,
      hallucinatedObjects,
      grammarScore,
      notes: missingObjects.length > 0 ? `Missing objects: ${missingObjects.join(", ")}` : "Accurate description",
    };
  }

  public static summarizeMetrics(results: EvalResult[]): DatasetMetricsSummary[] {
    const groups = new Map<string, EvalResult[]>();

    for (const r of results) {
      const key = `${r.source}::${r.model}::${r.captionMode}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(r);
    }

    const summaries: DatasetMetricsSummary[] = [];

    for (const [key, groupResults] of groups.entries()) {
      const [source, model, captionMode] = key.split("::");
      const total = groupResults.length;
      const successful = groupResults.filter((r) => !r.failureStatus);

      const successRate = total > 0 ? (successful.length / total) * 100 : 0;
      const avgInferenceTimeMs =
        total > 0 ? Math.round(groupResults.reduce((acc, r) => acc + r.inferenceTimeMs, 0) / total) : 0;
      const avgHumanCorrectness =
        total > 0
          ? Math.round((groupResults.reduce((acc, r) => acc + r.humanCorrectnessScore, 0) / total) * 100) / 100
          : 0;
      const avgGrammarScore =
        total > 0
          ? Math.round((groupResults.reduce((acc, r) => acc + r.grammarScore, 0) / total) * 100) / 100
          : 0;
      const hallucinationCount = groupResults.filter((r) => r.hallucinatedObjects.length > 0).length;
      const hallucinationRate = total > 0 ? Math.round((hallucinationCount / total) * 100) : 0;

      summaries.push({
        source,
        model,
        captionMode,
        totalSamples: total,
        successRate,
        avgInferenceTimeMs,
        avgHumanCorrectness,
        avgGrammarScore,
        hallucinationRate,
      });
    }

    return summaries;
  }
}
