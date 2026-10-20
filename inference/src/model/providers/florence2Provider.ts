import { performance } from "node:perf_hooks";
import {
  AutoProcessor,
  AutoTokenizer,
  Florence2ForConditionalGeneration,
  RawImage,
  env,
} from "@huggingface/transformers";
import { loadConfig } from "../../config.js";
import { getOrLoad, loadWithCacheRecovery, loadedModels } from "../loader.js";
import { cleanCaption } from "../postprocess.js";
import { setModelStateForTesting } from "../state.js";
import { CaptionGenerationError, ModelLoadError } from "../types.js";
import { validateImagePath } from "../validation.js";
import {
  CaptionMode,
  CaptionModel,
  GenerateOptions,
  InferenceResult,
  UnsupportedModeError,
} from "./types.js";

export interface Florence2ModelTriple {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenizer: any;
}

let mockFlorence2Triple: Florence2ModelTriple | null = null;

/**
 * Injects a mock Florence-2 model triple (or clears it) for testing.
 */
export function setFlorence2ModelForTesting(mock: Florence2ModelTriple | null): void {
  mockFlorence2Triple = mock;
  const key = "onnx-community/Florence-2-base-ft::main";
  if (mock === null) {
    loadedModels.delete(key);
    setModelStateForTesting(
      {
        loaded: false,
        loading: false,
        modelId: "onnx-community/Florence-2-base-ft",
        modelRevision: "main",
        error: null,
      },
      "onnx-community/Florence-2-base-ft"
    );
  } else {
    loadedModels.set(key, Promise.resolve(mock));
    setModelStateForTesting(
      {
        loaded: true,
        loading: false,
        modelId: "onnx-community/Florence-2-base-ft",
        modelRevision: "main",
        error: null,
      },
      "onnx-community/Florence-2-base-ft"
    );
  }
}

const PROMPT_MAP: Record<"SHORT" | "DETAILED" | "OCR", string> = {
  SHORT: "<CAPTION>",
  DETAILED: "<MORE_DETAILED_CAPTION>",
  OCR: "<OCR>",
};

export class Florence2CaptionModel implements CaptionModel {
  public readonly id = "onnx-community/Florence-2-base-ft";
  public readonly revision = "main";
  public readonly capabilities = new Set<CaptionMode>([
    "SHORT",
    "DETAILED",
    "OCR",
  ]);

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
    const task = PROMPT_MAP[mode as "SHORT" | "DETAILED" | "OCR"];

    const key = `${this.id}::${this.revision}`;
    const loadStart = performance.now();
    let triple: Florence2ModelTriple;

    try {
      triple = await getOrLoad<Florence2ModelTriple>(key, async () => {
        if (mockFlorence2Triple) {
          setModelStateForTesting(
            {
              loaded: true,
              loading: false,
              modelId: this.id,
              modelRevision: this.revision,
              error: null,
            },
            this.id
          );
          return mockFlorence2Triple;
        }

        env.cacheDir = config.modelCacheDir;
        setModelStateForTesting(
          {
            modelId: this.id,
            modelRevision: this.revision,
            loading: true,
            error: null,
          },
          this.id
        );

        try {
          const loaded = await loadWithCacheRecovery(
            this.id,
            config.modelCacheDir,
            async () => {
              const modelOptions = { revision: this.revision };
              const [model, processor, tokenizer] = await Promise.all([
                Florence2ForConditionalGeneration.from_pretrained(this.id, modelOptions),
                AutoProcessor.from_pretrained(this.id, modelOptions),
                AutoTokenizer.from_pretrained(this.id, modelOptions),
              ]);
              return { model, processor, tokenizer };
            }
          );

          setModelStateForTesting(
            {
              loaded: true,
              loading: false,
              modelId: this.id,
              modelRevision: this.revision,
              error: null,
            },
            this.id
          );

          return loaded;
        } catch (firstError) {
          const errMsg = firstError instanceof Error ? firstError.message : String(firstError);
          setModelStateForTesting(
            {
              loaded: false,
              loading: false,
              modelId: this.id,
              modelRevision: this.revision,
              error: errMsg,
            },
            this.id
          );
          throw new ModelLoadError(
            `Failed to load Florence-2 model '${this.id}' (revision: ${this.revision}): ${errMsg}`,
            firstError
          );
        }
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
    let rawAnswer: unknown;
    try {
      const { model, processor, tokenizer } = triple;

      const image = await RawImage.read(validatedPath);
      const visionInputs = await processor(image);
      const prompts = processor.construct_prompts(task);
      const textInputs = tokenizer(prompts);

      const max_new_tokens =
        options.maxNewTokens ??
        options.max_new_tokens ??
        (mode === "DETAILED"
          ? config.florence2Generation.maxNewTokensDetailed
          : config.florence2Generation.maxNewTokensShort);

      const num_beams =
        options.numBeams ??
        options.num_beams ??
        config.florence2Generation.numBeams;

      const generateArgs: Record<string, unknown> = {
        ...textInputs,
        ...visionInputs,
        max_new_tokens,
        num_beams,
      };

      if (options.doSample !== undefined || options.do_sample !== undefined) {
        generateArgs.do_sample = options.doSample ?? options.do_sample;
      }
      if (options.noRepeatNgramSize !== undefined || options.no_repeat_ngram_size !== undefined) {
        generateArgs.no_repeat_ngram_size =
          options.noRepeatNgramSize ?? options.no_repeat_ngram_size;
      }
      if (options.repetitionPenalty !== undefined || options.repetition_penalty !== undefined) {
        generateArgs.repetition_penalty =
          options.repetitionPenalty ?? options.repetition_penalty;
      }

      const ids = await model.generate(generateArgs);
      const decoded = tokenizer.batch_decode(ids, { skip_special_tokens: false });
      const text = Array.isArray(decoded) ? decoded[0] : String(decoded ?? "");

      const result = processor.post_process_generation(text, task, image.size);
      rawAnswer = result?.[task];
    } catch (error) {
      throw new CaptionGenerationError(
        `Inference failed for image '${validatedPath}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
    const inferenceTimeMs = Math.round(performance.now() - inferenceStart);

    let rawCaption = "";
    if (typeof rawAnswer === "string") {
      rawCaption = rawAnswer;
    } else if (
      rawAnswer &&
      typeof rawAnswer === "object" &&
      Array.isArray((rawAnswer as { labels?: string[] }).labels)
    ) {
      rawCaption = (rawAnswer as { labels: string[] }).labels.join(" ");
    } else if (rawAnswer !== undefined && rawAnswer !== null) {
      rawCaption = String(rawAnswer);
    }

    // Strip raw task token and special tokens (never return raw task token)
    let stripped = rawCaption.replaceAll(task, "").trim();
    stripped = stripped.replace(/<\/?s>/g, "").trim();
    for (const promptToken of Object.values(PROMPT_MAP)) {
      stripped = stripped.replaceAll(promptToken, "").trim();
    }

    const caption = cleanCaption(stripped);

    return {
      caption,
      model: this.id,
      modelVersion: this.revision,
      mode,
      inferenceTimeMs,
      modelLoadTimeMs,
      input: validatedPath,
      requestId: options.requestId,
      details: {
        taskPrompt: task,
        rawLength: typeof rawAnswer === "string" ? rawAnswer.length : undefined,
      },
    };
  }
}
