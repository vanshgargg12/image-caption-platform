export interface ModelState {
  loaded: boolean;
  modelId: string;
  modelRevision: string;
}

export function getModelState(): ModelState {
  return {
    loaded: false,
    modelId: process.env.MODEL_ID ?? "Xenova/vit-gpt2-image-captioning",
    modelRevision: process.env.MODEL_REVISION ?? "main",
  };
}
