import { env, pipeline } from "@huggingface/transformers";
import { ModelConfig, ModelLoadError } from "./types.js";

// Type for image-to-text pipeline function returned by transformers.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImageToTextPipeline = any;

let pipelinePromise: Promise<ImageToTextPipeline> | null = null;
let cachedConfigKey: string | null = null;
let isMocked = false;

export async function getOrLoadModel(config: ModelConfig): Promise<ImageToTextPipeline> {
  if (isMocked && pipelinePromise) {
    return pipelinePromise;
  }

  const configKey = `${config.modelId}::${config.modelRevision}::${config.modelCacheDir}`;

  if (pipelinePromise && cachedConfigKey === configKey) {
    return pipelinePromise;
  }

  // Configure HuggingFace Transformers.js environment cache directory
  env.cacheDir = config.modelCacheDir;

  cachedConfigKey = configKey;
  pipelinePromise = (async () => {
    try {
      const options: Record<string, unknown> = {};
      if (config.modelRevision) {
        options.revision = config.modelRevision;
      }
      const pipe = await pipeline("image-to-text", config.modelId, options);
      return pipe;
    } catch (error) {
      // Reset cached promise on error so subsequent attempts can retry
      pipelinePromise = null;
      cachedConfigKey = null;
      throw new ModelLoadError(
        `Failed to load image captioning model '${config.modelId}' (revision: ${config.modelRevision}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
  })();

  return pipelinePromise;
}

export function resetModelLoader(): void {
  pipelinePromise = null;
  cachedConfigKey = null;
  isMocked = false;
}

export function setModelPipelineForTesting(mockPipe: ImageToTextPipeline | null): void {
  if (mockPipe === null) {
    resetModelLoader();
  } else {
    isMocked = true;
    pipelinePromise = Promise.resolve(mockPipe);
    cachedConfigKey = "TEST_MOCK_KEY";
  }
}


