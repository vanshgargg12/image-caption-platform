export type SupportedImageType = 'jpeg' | 'png' | 'webp';

/**
 * Detects the image type by inspecting header magic bytes.
 * Rules match the backend ImageValidator:
 * - JPEG: 0xFF 0xD8 0xFF
 * - PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
 * - WebP: 'RIFF' at 0-3 and 'WEBP' at 8-11
 */
export function detectImageType(buffer: ArrayBuffer | Uint8Array): SupportedImageType | null {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 3) return null;

  // JPEG: 0xFF, 0xD8, 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP container signature: 'RIFF' at 0-3 and 'WEBP' at 8-11
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Returns true if the buffer matches a valid JPEG, PNG, or WebP signature.
 */
export function isValidImageSignature(buffer: ArrayBuffer | Uint8Array): boolean {
  return detectImageType(buffer) !== null;
}

/**
 * Decodes an image file and retrieves its pixel dimensions.
 * Uses createImageBitmap when available, falling back to an Image element.
 * Returns null if the image is corrupted or undecodable.
 */
export async function decodeImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
      return dimensions;
    } catch {
      return null;
    }
  }

  if (typeof window !== 'undefined' && typeof Image !== 'undefined' && typeof URL !== 'undefined') {
    return new Promise((resolve) => {
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  }

  return null;
}
