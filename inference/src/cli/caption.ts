#!/usr/bin/env node
import { generateCaption } from "../model/caption.js";
import { ImageValidationError, ModelLoadError, CaptionGenerationError } from "../model/types.js";

async function main() {
  const args = process.argv.slice(2);
  const imagePath = args[0];

  if (!imagePath) {
    console.error("Error: Image path argument is required.");
    console.error("Usage: npm run caption -- /path/to/image.jpg");
    process.exit(1);
  }

  try {
    const result = await generateCaption(imagePath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    if (
      error instanceof ImageValidationError ||
      error instanceof ModelLoadError ||
      error instanceof CaptionGenerationError
    ) {
      console.error(`Error [${error.name}]: ${error.message}`);
    } else {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
