export interface ModelConfig {
  modelId: string;
  modelRevision: string;
  modelCacheDir: string;
  maxImageSizeBytes: number;
  inferenceTimeoutMs: number;
  maxConcurrentInference: number;
}

export interface CaptionResult {
  caption: string;
  model: string;
  modelVersion: string;
  mode?: string;
  inferenceTimeMs: number;
  modelLoadTimeMs: number;
  input: string;
  requestId?: string;
}

export interface InferErrorResponse {
  timestamp: string;
  requestId: string;
  code: string;
  message: string;
  details: unknown | null;
}

export class ImageValidationError extends Error {
  constructor(message: string, public readonly code: string = "UNSUPPORTED_IMAGE_TYPE") {
    super(message);
    this.name = "ImageValidationError";
  }
}

export class ModelLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ModelLoadError";
  }
}

export class CaptionGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CaptionGenerationError";
  }
}

export class ConcurrencyLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyLimitError";
  }
}

export class InferenceTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InferenceTimeoutError";
  }
}
