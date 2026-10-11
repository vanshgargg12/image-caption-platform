import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageValidationError } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function detectImageType(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (!buf || buf.length < 3) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: "RIFF" at 0-3 and "WEBP" at 8-11 (12 bytes)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export async function assertDecodable(buf: Buffer): Promise<void> {
  try {
    const image = sharp(buf, { limitInputPixels: 50_000_000 });
    const metadata = await image.metadata();

    const allowedFormats = new Set(["jpeg", "png", "webp"]);
    if (!metadata.format || !allowedFormats.has(metadata.format)) {
      throw new Error("Unsupported format");
    }

    if (
      typeof metadata.width !== "number" ||
      typeof metadata.height !== "number" ||
      metadata.width < 32 ||
      metadata.height < 32
    ) {
      throw new Error("Image dimensions too small");
    }

    await image.clone().resize(64, 64, { fit: "inside" }).raw().toBuffer();
  } catch {
    throw new ImageValidationError(
      "Image is corrupt, truncated, or not a valid JPEG/PNG/WebP.",
      "CORRUPT_IMAGE"
    );
  }
}

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
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 3) {
      throw new ImageValidationError(`File is empty or truncated: ${inputPath}`);
    }

    const imageType = detectImageType(buffer.subarray(0, bytesRead));
    if (!imageType) {
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
