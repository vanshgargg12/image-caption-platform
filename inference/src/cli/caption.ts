#!/usr/bin/env node
import { ModelRegistry } from "../model/providers/modelRegistry.js";
import { CaptionMode } from "../model/providers/types.js";
import { ImageValidationError, ModelLoadError, CaptionGenerationError } from "../model/types.js";
import { UnsupportedModeError } from "../model/providers/types.js";

async function main() {
  const args = process.argv.slice(2);
  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  const imagePath = positionalArgs[0];

  if (!imagePath) {
    console.error("Error: Image path argument is required.");
    console.error("Usage: npm run caption -- /path/to/image.jpg [--model=florence-2] [--mode=SHORT|DETAILED]");
    process.exit(1);
  }

  // Parse optional --model and --mode arguments
  let modelArg: string | undefined;
  let modeArg: CaptionMode = "SHORT";

  for (const arg of args) {
    if (arg.startsWith("--model=")) {
      modelArg = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--mode=")) {
      const modeVal = arg.split("=")[1]?.trim().toUpperCase();
      if (modeVal) {
        modeArg = modeVal as CaptionMode;
      }
    }
  }

  try {
    const model = ModelRegistry.getInstance().getModel(modelArg);
    const result = await model.generate(imagePath, modeArg);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    if (
      error instanceof ImageValidationError ||
      error instanceof ModelLoadError ||
      error instanceof CaptionGenerationError ||
      error instanceof UnsupportedModeError
    ) {
      console.error(`Error [${error.name}]: ${error.message}`);
    } else {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
