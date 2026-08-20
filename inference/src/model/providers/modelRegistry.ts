import { CaptionModel } from "./types.js";
import { VitGpt2CaptionModel } from "./vitGpt2Provider.js";
import { Florence2CaptionModel } from "./florence2Provider.js";

export class ModelRegistry {
  private static instance: ModelRegistry;
  private readonly models = new Map<string, CaptionModel>();
  private defaultModelId = "Xenova/vit-gpt2-image-captioning";

  constructor() {
    this.registerModel(new VitGpt2CaptionModel());
    this.registerModel(new Florence2CaptionModel());
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  public registerModel(model: CaptionModel): void {
    this.models.set(model.id, model);
  }

  public getModel(modelId?: string): CaptionModel {
    const targetId = modelId || this.defaultModelId;

    // Direct match
    if (this.models.has(targetId)) {
      return this.models.get(targetId)!;
    }

    // Friendly alias matching
    const lowerTarget = targetId.toLowerCase();
    for (const [id, model] of this.models.entries()) {
      if (
        id.toLowerCase() === lowerTarget ||
        (lowerTarget.includes("vit-gpt2") && id.includes("vit-gpt2")) ||
        (lowerTarget.includes("florence") && id.includes("Florence"))
      ) {
        return model;
      }
    }

    throw new Error(`Model '${targetId}' is not registered. Available models: ${Array.from(this.models.keys()).join(", ")}`);
  }

  public listModels(): Array<{ id: string; revision: string; capabilities: string[] }> {
    return Array.from(this.models.values()).map((m) => ({
      id: m.id,
      revision: m.revision,
      capabilities: Array.from(m.capabilities),
    }));
  }

  public setDefaultModelId(id: string): void {
    if (!this.models.has(id)) {
      throw new Error(`Cannot set unknown model '${id}' as default.`);
    }
    this.defaultModelId = id;
  }
}
