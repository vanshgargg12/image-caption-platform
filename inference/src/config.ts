export interface AppConfig {
  port: number;
  modelId: string;
  modelRevision: string;
  modelCacheDir: string;
  maxImageSizeBytes: number;
  inferenceTimeoutMs: number;
  maxConcurrentInference: number;
}

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.INFERENCE_PORT ?? "3001", 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error("INFERENCE_PORT must be a positive integer");
  }

  const maxImageSizeBytes = Number.parseInt(
    process.env.MAX_IMAGE_SIZE_BYTES ?? "10485760",
    10
  );
  if (Number.isNaN(maxImageSizeBytes) || maxImageSizeBytes <= 0) {
    throw new Error("MAX_IMAGE_SIZE_BYTES must be a positive integer");
  }

  const inferenceTimeoutMs = Number.parseInt(
    process.env.INFERENCE_TIMEOUT_MS ?? "30000",
    10
  );
  if (Number.isNaN(inferenceTimeoutMs) || inferenceTimeoutMs <= 0) {
    throw new Error("INFERENCE_TIMEOUT_MS must be a positive integer");
  }

  const maxConcurrentInference = Number.parseInt(
    process.env.MAX_CONCURRENT_INFERENCE ?? "1",
    10
  );
  if (Number.isNaN(maxConcurrentInference) || maxConcurrentInference <= 0) {
    throw new Error("MAX_CONCURRENT_INFERENCE must be a positive integer");
  }

  return {
    port,
    modelId: process.env.MODEL_ID ?? "Xenova/vit-gpt2-image-captioning",
    modelRevision: process.env.MODEL_REVISION ?? "main",
    modelCacheDir: process.env.MODEL_CACHE_DIR ?? ".model-cache",
    maxImageSizeBytes,
    inferenceTimeoutMs,
    maxConcurrentInference,
  };
}
