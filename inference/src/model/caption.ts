import { performance } from "node:perf_hooks";
import { AppConfig, loadConfig } from "../config.js";
import { getOrLoadModel } from "./loader.js";
import { CaptionGenerationError, CaptionResult, ModelConfig } from "./types.js";
import { validateImagePath } from "./validation.js";

export interface GenerateCaptionOptions {
  config?: ModelConfig;
  maxNewTokens?: number;
  max_new_tokens?: number;
  numBeams?: number;
  num_beams?: number;
  noRepeatNgramSize?: number;
  no_repeat_ngram_size?: number;
  repetitionPenalty?: number;
  repetition_penalty?: number;
  doSample?: boolean;
  do_sample?: boolean;
}

export async function generateCaption(
  inputPath: string,
  options: GenerateCaptionOptions = {}
): Promise<CaptionResult> {
  const validatedPath = validateImagePath(inputPath);
  const config = options.config ?? loadConfig();

  const loadStart = performance.now();
  let pipe;
  try {
    pipe = await getOrLoadModel(config);
  } catch (error) {
    if (error instanceof Error && error.name === "ModelLoadError") {
      throw error;
    }
    throw new CaptionGenerationError(
      `Model load failed: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
  const modelLoadTimeMs = Math.round(performance.now() - loadStart);

  const inferenceStart = performance.now();
  let output;
  try {
    const genConfig = (config as Partial<AppConfig>).generation ?? loadConfig().generation;
    const generationParams = {
      max_new_tokens: options.maxNewTokens ?? options.max_new_tokens ?? genConfig.maxNewTokens,
      num_beams: options.numBeams ?? options.num_beams ?? genConfig.numBeams,
      no_repeat_ngram_size:
        options.noRepeatNgramSize ?? options.no_repeat_ngram_size ?? genConfig.noRepeatNgramSize,
      repetition_penalty:
        options.repetitionPenalty ?? options.repetition_penalty ?? genConfig.repetitionPenalty,
      do_sample: options.doSample ?? options.do_sample ?? false,
    };
    output = await pipe(validatedPath, generationParams);
  } catch (error) {
    throw new CaptionGenerationError(
      `Inference failed for image '${validatedPath}': ${
        error instanceof Error ? error.message : String(error)
      }`,
      error
    );
  }
  const inferenceTimeMs = Math.round(performance.now() - inferenceStart);

  let caption = "";
  if (Array.isArray(output) && output.length > 0) {
    caption = output[0]?.generated_text ?? output[0]?.text ?? "";
  } else if (typeof output === "object" && output !== null) {
    caption = (output as { generated_text?: string; text?: string }).generated_text ?? (output as { text?: string }).text ?? "";
  } else if (typeof output === "string") {
    caption = output;
  }

  caption = caption.trim();

  return {
    caption,
    model: config.modelId,
    modelVersion: config.modelRevision,
    inferenceTimeMs,
    modelLoadTimeMs,
    input: validatedPath,
  };
}
