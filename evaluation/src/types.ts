export interface ManifestItem {
  id: string;
  source: string;
  split: string;
  imagePath: string;
  references: string[];
  tags: string[];
  textPresent: boolean;
  lowQuality: boolean;
  novelObject: boolean;
  expectedObjects: string[];
  licenseReference: string;
}

export interface EvalResult {
  id: string;
  source: string;
  imagePath: string;
  model: string;
  modelRevision: string;
  captionMode: string;
  generatedCaption: string;
  inferenceTimeMs: number;
  failureStatus: boolean;
  humanCorrectnessScore: number;
  missingObjects: string[];
  hallucinatedObjects: string[];
  grammarScore: number;
  notes: string;
}

export interface BaselineReference {
  dataset: string;
  model: string;
  avgInferenceTimeMs: number;
  humanCorrectnessScore: number;
  grammarScore: number;
}

export interface DatasetMetricsSummary {
  source: string;
  model: string;
  captionMode: string;
  totalSamples: number;
  successRate: number;
  avgInferenceTimeMs: number;
  avgHumanCorrectness: number;
  avgGrammarScore: number;
  hallucinationRate: number;
}
