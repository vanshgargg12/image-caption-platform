export type CaptionMode =
  | "SHORT"
  | "DETAILED"
  | "OCR"
  | "OBJECT_DETECTION"
  | "REGION_DESCRIPTIONS";

export interface GenerateOptions {
  maxNewTokens?: number;
  doSample?: boolean;
  requestId?: string;
}

export interface InferenceResult {
  caption: string;
  model: string;
  modelVersion: string;
  mode: CaptionMode;
  inferenceTimeMs: number;
  modelLoadTimeMs: number;
  input: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface CaptionModel {
  readonly id: string;
  readonly revision: string;
  readonly capabilities: Set<CaptionMode>;
  supportsMode(mode: CaptionMode): boolean;
  generate(inputPath: string, mode: CaptionMode, options?: GenerateOptions): Promise<InferenceResult>;
}

export class UnsupportedModeError extends Error {
  public readonly code = "UNSUPPORTED_CAPTION_MODE";

  constructor(modelId: string, mode: string, supportedModes: string[]) {
    super(
      `Model '${modelId}' does not support caption mode '${mode}'. Supported modes: ${supportedModes.join(", ")}`
    );
    this.name = "UnsupportedModeError";
  }
}
