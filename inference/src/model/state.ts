import { loadConfig } from "../config.js";
import { getOrLoadModel } from "./loader.js";
import { ModelConfig } from "./types.js";
import { ModelRegistry } from "./providers/modelRegistry.js";

export interface ModelState {
  loaded: boolean;
  loading: boolean;
  modelId: string;
  modelRevision: string;
  error: string | null;
}

const modelStates = new Map<string, ModelState>();
const initPromises = new Map<string, Promise<void>>();

function resolveModelId(modelId?: string): { id: string; revision: string } {
  const config = loadConfig();
  const targetId = modelId || config.modelId;
  try {
    const regModel = ModelRegistry.getInstance().getModel(targetId);
    return { id: regModel.id, revision: regModel.revision };
  } catch {
    return {
      id: targetId,
      revision: targetId === config.modelId ? config.modelRevision : "main",
    };
  }
}

/**
 * Returns the current state for a model, defaulting to the service default model if omitted.
 */
export function getModelState(modelId?: string): ModelState {
  const resolved = resolveModelId(modelId);
  const existing = modelStates.get(resolved.id);
  if (existing) {
    return existing;
  }

  return {
    loaded: false,
    loading: false,
    modelId: resolved.id,
    modelRevision: resolved.revision,
    error: null,
  };
}

/**
 * Updates model state for testing purposes.
 */
export function setModelStateForTesting(
  state: Partial<ModelState>,
  modelId?: string
): void {
  const resolved = resolveModelId(modelId || state.modelId);
  const existing = getModelState(resolved.id);

  const updated: ModelState = {
    ...existing,
    ...state,
    modelId: resolved.id,
    modelRevision: state.modelRevision || existing.modelRevision || resolved.revision,
  };

  modelStates.set(resolved.id, updated);

  if (state.loaded) {
    initPromises.set(resolved.id, Promise.resolve());
  }
}

/**
 * Clears tracked model states and pending initializations.
 */
export function resetModelState(): void {
  modelStates.clear();
  initPromises.clear();
}

/**
 * Initializes a model, returning an existing promise if already in-flight.
 */
export async function initializeModel(config?: ModelConfig): Promise<void> {
  const cfg = config ?? loadConfig();
  const resolved = resolveModelId(cfg.modelId);
  const targetId = resolved.id;
  const state = getModelState(targetId);

  if (state.loaded) return;
  if (initPromises.has(targetId)) return initPromises.get(targetId)!;

  const promise = (async () => {
    setModelStateForTesting(
      {
        modelId: targetId,
        modelRevision: cfg.modelRevision || resolved.revision,
        loading: true,
        error: null,
      },
      targetId
    );

    try {
      await getOrLoadModel(cfg);
      setModelStateForTesting(
        {
          loaded: true,
          loading: false,
          modelId: targetId,
          modelRevision: cfg.modelRevision || resolved.revision,
          error: null,
        },
        targetId
      );
    } catch (error) {
      setModelStateForTesting(
        {
          loaded: false,
          loading: false,
          modelId: targetId,
          modelRevision: cfg.modelRevision || resolved.revision,
          error: error instanceof Error ? error.message : String(error),
        },
        targetId
      );
      initPromises.delete(targetId);
      throw error;
    }
  })();

  initPromises.set(targetId, promise);
  return promise;
}
