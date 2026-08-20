import { loadConfig } from "../config.js";
import { getOrLoadModel } from "./loader.js";
import { ModelConfig } from "./types.js";

export interface ModelState {
  loaded: boolean;
  loading: boolean;
  modelId: string;
  modelRevision: string;
  error: string | null;
}

let currentState: ModelState = {
  loaded: false,
  loading: false,
  modelId: "Xenova/vit-gpt2-image-captioning",
  modelRevision: "main",
  error: null,
};

let initPromise: Promise<void> | null = null;

export function getModelState(): ModelState {
  return currentState;
}

export function setModelStateForTesting(state: Partial<ModelState>): void {
  currentState = {
    ...currentState,
    ...state,
  };
  if (state.loaded) {
    initPromise = Promise.resolve();
  }
}

export async function initializeModel(config?: ModelConfig): Promise<void> {
  if (currentState.loaded) return;
  if (initPromise) return initPromise;

  const cfg = config ?? loadConfig();

  currentState = {
    ...currentState,
    modelId: cfg.modelId,
    modelRevision: cfg.modelRevision,
    loading: true,
    error: null,
  };

  initPromise = (async () => {
    try {
      await getOrLoadModel(cfg);
      currentState.loaded = true;
      currentState.loading = false;
      currentState.error = null;
    } catch (error) {
      currentState.loaded = false;
      currentState.loading = false;
      currentState.error = error instanceof Error ? error.message : String(error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}
