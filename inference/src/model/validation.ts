import fs from "node:fs";
import path from "node:path";
import { ImageValidationError } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

export function validateImagePath(inputPath: string | undefined | null): string {
  if (!inputPath || inputPath.trim() === "") {
    throw new ImageValidationError("Image file path must be provided.");
  }

  const resolvedPath = path.resolve(inputPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new ImageValidationError(`Image file does not exist: ${inputPath}`);
  }

  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    throw new ImageValidationError(`Image file is not readable: ${inputPath}`);
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new ImageValidationError(
      `Unsupported file format '${ext}'. Only JPEG (.jpg, .jpeg) and PNG (.png) files are supported.`
    );
  }

  // Verify file headers (magic bytes) to ensure file is valid JPEG or PNG
  try {
    const fd = fs.openSync(resolvedPath, "r");
    const buffer = Buffer.alloc(8);
    const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      throw new ImageValidationError(`File is empty or truncated: ${inputPath}`);
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    if (!isJpeg && !isPng) {
      throw new ImageValidationError(
        `File headers do not match a valid JPEG or PNG image: ${inputPath}`
      );
    }
  } catch (error) {
    if (error instanceof ImageValidationError) {
      throw error;
    }
    throw new ImageValidationError(
      `Failed to read image file headers for ${inputPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return resolvedPath;
}
