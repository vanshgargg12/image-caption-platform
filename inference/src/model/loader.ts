import fs from "node:fs";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { setModelStateForTesting } from "./state.js";
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
    const options: Record<string, unknown> = {};
    if (config.modelRevision) {
      options.revision = config.modelRevision;
    }

    try {
      const pipe = await pipeline("image-to-text", config.modelId, options);
      setModelStateForTesting({
        loaded: true,
        loading: false,
        modelId: config.modelId,
        modelRevision: config.modelRevision,
        error: null,
      });
      return pipe;
    } catch (firstError) {
      const errMsg = firstError instanceof Error ? firstError.message : String(firstError);
      
      // If cached ONNX model file is corrupted (e.g. Protobuf parsing failed), clean up and retry once
      if (errMsg.includes("Protobuf parsing failed") || errMsg.includes("failed to load") || errMsg.includes("Unexpected end of JSON")) {
        const modelDir = path.join(config.modelCacheDir, config.modelId);
        if (fs.existsSync(modelDir)) {
          try {
            fs.rmSync(modelDir, { recursive: true, force: true });
          } catch {
            // Ignore removal errors
          }
        }
        try {
          const pipeRetry = await pipeline("image-to-text", config.modelId, options);
          setModelStateForTesting({
            loaded: true,
            loading: false,
            modelId: config.modelId,
            modelRevision: config.modelRevision,
            error: null,
          });
          return pipeRetry;
        } catch (retryError) {
          pipelinePromise = null;
          cachedConfigKey = null;
          setModelStateForTesting({
            loaded: false,
            loading: false,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          });
          throw new ModelLoadError(
            `Failed to load image captioning model '${config.modelId}' (revision: ${config.modelRevision}) after cache recovery: ${
              retryError instanceof Error ? retryError.message : String(retryError)
            }`,
            retryError
          );
        }
      }

      // Reset cached promise on error so subsequent attempts can retry
      pipelinePromise = null;
      cachedConfigKey = null;
      setModelStateForTesting({
        loaded: false,
        loading: false,
        error: errMsg,
      });
      throw new ModelLoadError(
        `Failed to load image captioning model '${config.modelId}' (revision: ${config.modelRevision}): ${errMsg}`,
        firstError
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
