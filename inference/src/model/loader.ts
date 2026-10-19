import fs from "node:fs";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { resetModelState, setModelStateForTesting } from "./state.js";
import { ModelConfig, ModelLoadError } from "./types.js";

// Type for image-to-text pipeline function returned by transformers.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImageToTextPipeline = any;

export type LoadedModel = unknown;

export const loadedModels = new Map<string, Promise<LoadedModel>>();
export function getLoadedModels(): Map<string, Promise<LoadedModel>> {
  return loadedModels;
}
let isMocked = false;
let mockPipeline: ImageToTextPipeline | null = null;

/**
 * Loads or retrieves a cached model instance by key.
 *
 * @param key The cache key, conventionally `${modelId}::${revision}`
 * @param factory An async factory function that initializes and returns the model
 * @returns The resolved model instance
 */
export async function getOrLoad<T = unknown>(
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const existing = loadedModels.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await factory();
    } catch (error) {
      loadedModels.delete(key);
      throw error;
    }
  })();

  loadedModels.set(key, promise as Promise<LoadedModel>);
  return promise;
}

/**
 * Removes cached corrupted model files for a given model directory.
 */
export function recoverCorruptedModelCache(modelId: string, modelCacheDir: string): boolean {
  const modelDir = path.join(modelCacheDir, modelId);
  if (fs.existsSync(modelDir)) {
    try {
      fs.rmSync(modelDir, { recursive: true, force: true });
      return true;
    } catch {
      // Ignore removal errors
      return false;
    }
  }
  return false;
}

/**
 * Executes a loader with single-retry recovery if corrupted cache files are detected.
 */
export async function loadWithCacheRecovery<T>(
  modelId: string,
  modelCacheDir: string,
  loader: () => Promise<T>
): Promise<T> {
  try {
    return await loader();
  } catch (firstError) {
    const errMsg = firstError instanceof Error ? firstError.message : String(firstError);

    if (
      errMsg.includes("Protobuf parsing failed") ||
      errMsg.includes("failed to load") ||
      errMsg.includes("Unexpected end of JSON")
    ) {
      recoverCorruptedModelCache(modelId, modelCacheDir);
      return await loader();
    }
    throw firstError;
  }
}

/**
 * Loads or retrieves a cached transformers.js pipeline for a ModelConfig.
 */
export async function getOrLoadModel(config: ModelConfig): Promise<ImageToTextPipeline> {
  const key = `${config.modelId}::${config.modelRevision || "main"}`;

  return getOrLoad(key, async () => {
    if (isMocked && mockPipeline) {
      setModelStateForTesting(
        {
          loaded: true,
          loading: false,
          modelId: config.modelId,
          modelRevision: config.modelRevision || "main",
          error: null,
        },
        config.modelId
      );
      return mockPipeline;
    }

    env.cacheDir = config.modelCacheDir;
    const options: Record<string, unknown> = {};
    if (config.modelRevision) {
      options.revision = config.modelRevision;
    }

    setModelStateForTesting(
      {
        modelId: config.modelId,
        modelRevision: config.modelRevision || "main",
        loading: true,
        error: null,
      },
      config.modelId
    );

    try {
      const pipe = await pipeline("image-to-text", config.modelId, options);
      setModelStateForTesting(
        {
          loaded: true,
          loading: false,
          modelId: config.modelId,
          modelRevision: config.modelRevision || "main",
          error: null,
        },
        config.modelId
      );
      return pipe;
    } catch (firstError) {
      const errMsg = firstError instanceof Error ? firstError.message : String(firstError);

      if (
        errMsg.includes("Protobuf parsing failed") ||
        errMsg.includes("failed to load") ||
        errMsg.includes("Unexpected end of JSON")
      ) {
        recoverCorruptedModelCache(config.modelId, config.modelCacheDir);
        try {
          const pipeRetry = await pipeline("image-to-text", config.modelId, options);
          setModelStateForTesting(
            {
              loaded: true,
              loading: false,
              modelId: config.modelId,
              modelRevision: config.modelRevision || "main",
              error: null,
            },
            config.modelId
          );
          return pipeRetry;
        } catch (retryError) {
          setModelStateForTesting(
            {
              loaded: false,
              loading: false,
              modelId: config.modelId,
              modelRevision: config.modelRevision || "main",
              error: retryError instanceof Error ? retryError.message : String(retryError),
            },
            config.modelId
          );
          throw new ModelLoadError(
            `Failed to load image captioning model '${config.modelId}' (revision: ${config.modelRevision}) after cache recovery: ${
              retryError instanceof Error ? retryError.message : String(retryError)
            }`,
            retryError
          );
        }
      }

      setModelStateForTesting(
        {
          loaded: false,
          loading: false,
          modelId: config.modelId,
          modelRevision: config.modelRevision || "main",
          error: errMsg,
        },
        config.modelId
      );
      throw new ModelLoadError(
        `Failed to load image captioning model '${config.modelId}' (revision: ${config.modelRevision}): ${errMsg}`,
        firstError
      );
    }
  });
}

export function resetModelLoader(): void {
  loadedModels.clear();
  isMocked = false;
  mockPipeline = null;
  resetModelState();
}

export function setModelPipelineForTesting(mockPipe: ImageToTextPipeline | null): void {
  loadedModels.clear();
  if (mockPipe === null) {
    isMocked = false;
    mockPipeline = null;
    resetModelState();
  } else {
    isMocked = true;
    mockPipeline = mockPipe;
  }
}
