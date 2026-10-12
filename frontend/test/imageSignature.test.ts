import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectImageType, isValidImageSignature, decodeImageDimensions } from '../lib/validation/imageSignature';

describe('imageSignature validation module', () => {
  const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x01, 0x01, 0x01]);
  const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const WEBP_BYTES = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);
  const WAV_BYTES = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x41, 0x56, 0x45, // WAVE
  ]);
  const PDF_BYTES = new TextEncoder().encode('%PDF-1.5 test file');

  it('identifies valid JPEG magic bytes', () => {
    expect(detectImageType(JPEG_BYTES)).toBe('jpeg');
    expect(isValidImageSignature(JPEG_BYTES)).toBe(true);
  });

  it('identifies valid PNG magic bytes', () => {
    expect(detectImageType(PNG_BYTES)).toBe('png');
    expect(isValidImageSignature(PNG_BYTES)).toBe(true);
  });

  it('identifies valid WebP magic bytes', () => {
    expect(detectImageType(WEBP_BYTES)).toBe('webp');
    expect(isValidImageSignature(WEBP_BYTES)).toBe(true);
  });

  it('rejects WAV audio files starting with RIFF', () => {
    expect(detectImageType(WAV_BYTES)).toBeNull();
    expect(isValidImageSignature(WAV_BYTES)).toBe(false);
  });

  it('rejects PDF file bytes', () => {
    expect(detectImageType(PDF_BYTES)).toBeNull();
    expect(isValidImageSignature(PDF_BYTES)).toBe(false);
  });

  it('rejects truncated headers', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(new Uint8Array([]))).toBeNull();
    expect(detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });

  describe('decodeImageDimensions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('decodes dimensions using createImageBitmap', async () => {
      const mockClose = vi.fn();
      window.createImageBitmap = vi.fn().mockResolvedValue({
        width: 120,
        height: 80,
        close: mockClose,
      } as unknown as ImageBitmap);

      const file = new File([JPEG_BYTES], 'test.jpg', { type: 'image/jpeg' });
      const result = await decodeImageDimensions(file);

      expect(result).toEqual({ width: 120, height: 80 });
      expect(mockClose).toHaveBeenCalled();
    });

    it('returns null when createImageBitmap fails', async () => {
      window.createImageBitmap = vi.fn().mockRejectedValue(new Error('Corrupt data'));

      const file = new File([new Uint8Array([1, 2, 3])], 'corrupt.jpg', { type: 'image/jpeg' });
      const result = await decodeImageDimensions(file);

      expect(result).toBeNull();
    });
  });
});
