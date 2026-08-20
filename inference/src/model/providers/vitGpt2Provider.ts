import { performance } from "node:perf_hooks";
import { loadConfig } from "../../config.js";
import { getOrLoadModel } from "../loader.js";
import { CaptionGenerationError } from "../types.js";
import { validateImagePath } from "../validation.js";
import { CaptionMode, CaptionModel, GenerateOptions, InferenceResult, UnsupportedModeError } from "./types.js";

export class VitGpt2CaptionModel implements CaptionModel {
  public readonly id = "Xenova/vit-gpt2-image-captioning";
  public readonly revision = "main";
  public readonly capabilities = new Set<CaptionMode>(["SHORT"]);

  public supportsMode(mode: CaptionMode): boolean {
    return this.capabilities.has(mode);
  }

  public async generate(
    inputPath: string,
    mode: CaptionMode = "SHORT",
    options: GenerateOptions = {}
  ): Promise<InferenceResult> {
    if (!this.supportsMode(mode)) {
      throw new UnsupportedModeError(this.id, mode, Array.from(this.capabilities));
    }

    const validatedPath = validateImagePath(inputPath);
    const config = loadConfig();

    const loadStart = performance.now();
    let pipe;
    try {
      pipe = await getOrLoadModel({
        ...config,
        modelId: this.id,
        modelRevision: this.revision,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ModelLoadError") {
        throw error;
      }
      throw new CaptionGenerationError(
        `Model load failed for '${this.id}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
    const modelLoadTimeMs = Math.round(performance.now() - loadStart);

    const inferenceStart = performance.now();
    let output;
    try {
      const generationParams = {
        max_new_tokens: options.maxNewTokens ?? 50,
        do_sample: options.doSample ?? false,
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
      caption =
        (output as { generated_text?: string; text?: string }).generated_text ??
        (output as { text?: string }).text ??
        "";
    } else if (typeof output === "string") {
      caption = output;
    }

    return {
      caption: caption.trim(),
      model: this.id,
      modelVersion: this.revision,
      mode,
      inferenceTimeMs,
      modelLoadTimeMs,
      input: validatedPath,
      requestId: options.requestId,
    };
  }
}
