export interface AppConfig {
  port: number;
  modelId: string;
  modelRevision: string;
  modelCacheDir: string;
}

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.INFERENCE_PORT ?? "3001", 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error("INFERENCE_PORT must be a positive integer");
  }

  return {
    port,
    modelId: process.env.MODEL_ID ?? "Xenova/vit-gpt2-image-captioning",
    modelRevision: process.env.MODEL_REVISION ?? "main",
    modelCacheDir: process.env.MODEL_CACHE_DIR ?? ".model-cache",
  };
}
