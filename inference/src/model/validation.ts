import fs from "node:fs";
import path from "node:path";
import { ImageValidationError } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

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
      `Unsupported file format '${ext}'. Only JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp) files are supported.`
    );
  }

  // Verify file headers (magic bytes) to ensure file is valid JPEG, PNG, or WebP
  try {
    const fd = fs.openSync(resolvedPath, "r");
    const buffer = Buffer.alloc(8);
    const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      throw new ImageValidationError(`File is empty or truncated: ${inputPath}`);
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;

    if (!isJpeg && !isPng && !isWebp) {
      throw new ImageValidationError(
        `File headers do not match a valid JPEG, PNG, or WebP image: ${inputPath}`
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
