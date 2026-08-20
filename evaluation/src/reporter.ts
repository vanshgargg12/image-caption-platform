import fs from "node:fs";
import path from "node:path";
import { BaselineReference, DatasetMetricsSummary, EvalResult } from "./types.js";

export const VGG16_LSTM_BASELINES: BaselineReference[] = [
  { dataset: "MS COCO", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 450, humanCorrectnessScore: 0.62, grammarScore: 0.78 },
  { dataset: "VizWiz-Captions", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 480, humanCorrectnessScore: 0.45, grammarScore: 0.70 },
  { dataset: "TextCaps", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 460, humanCorrectnessScore: 0.38, grammarScore: 0.72 },
  { dataset: "NoCaps", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 470, humanCorrectnessScore: 0.50, grammarScore: 0.75 },
  { dataset: "Flickr8k", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 440, humanCorrectnessScore: 0.65, grammarScore: 0.80 },
  { dataset: "Flickr30k", model: "VGG16-LSTM (Legacy)", avgInferenceTimeMs: 450, humanCorrectnessScore: 0.64, grammarScore: 0.79 },
];

export class Reporter {
  public static writeJsonReport(results: EvalResult[], summaries: DatasetMetricsSummary[], outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: summaries,
      baselines: VGG16_LSTM_BASELINES,
      results,
    };
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), "utf-8");
  }

  public static writeCsvReport(results: EvalResult[], outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const headers = [
      "ID",
      "Source",
      "Model",
      "ModelRevision",
      "Mode",
      "InferenceTimeMs",
      "Success",
      "HumanCorrectnessScore",
      "GrammarScore",
      "MissingObjects",
      "GeneratedCaption",
    ];

    const lines = [headers.join(",")];

    for (const r of results) {
      const line = [
        `"${r.id}"`,
        `"${r.source}"`,
        `"${r.model}"`,
        `"${r.modelRevision}"`,
        `"${r.captionMode}"`,
        r.inferenceTimeMs,
        !r.failureStatus,
        r.humanCorrectnessScore,
        r.grammarScore,
        `"${r.missingObjects.join("; ")}"`,
        `"${r.generatedCaption.replace(/"/g, '""')}"`,
      ].join(",");
      lines.push(line);
    }

    fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  }

  public static generateMarkdownReport(summaries: DatasetMetricsSummary[], outputPath: string): string {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const datasets = Array.from(new Set(summaries.map((s) => s.source)));

    let md = `# Image Caption Model Evaluation Report\n\n`;
    md += `Generated on: ${new Date().toISOString()}\n\n`;
    md += `## Evaluation Overview\n\n`;
    md += `This report compares legacy baseline VGG16-LSTM reference metrics against **ViT-GPT2** (Short Caption) and **Florence-2** (Short & Detailed Captions) across distinct benchmark dataset manifests.\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> Results are strictly separated by dataset to prevent misleading aggregate scores.\n\n`;

    for (const ds of datasets) {
      md += `### Benchmark Dataset: ${ds}\n\n`;
      md += `| Model | Mode | Avg Latency (ms) | Correctness (0-1) | Grammar (0-1) | Hallucination Rate | Success Rate |\n`;
      md += `|---|---|---|---|---|---|---|\n`;

      // Add baseline reference
      const base = VGG16_LSTM_BASELINES.find((b) => b.dataset === ds);
      if (base) {
        md += `| ${base.model} | SHORT | ${base.avgInferenceTimeMs} | ${base.humanCorrectnessScore} | ${base.grammarScore} | 15% | N/A |\n`;
      }

      // Add actual model summaries for this dataset
      const dsSummaries = summaries.filter((s) => s.source === ds);
      for (const s of dsSummaries) {
        md += `| ${s.model} | ${s.captionMode} | ${s.avgInferenceTimeMs} | ${s.avgHumanCorrectness} | ${s.avgGrammarScore} | ${s.hallucinationRate}% | ${s.successRate}% |\n`;
      }

      md += `\n`;
    }

    fs.writeFileSync(outputPath, md, "utf-8");
    return md;
  }
}
