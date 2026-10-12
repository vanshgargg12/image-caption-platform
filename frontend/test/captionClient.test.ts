import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage } from '../lib/api/captionClient';

describe('captionClient error mapping', () => {
  it('maps CORRUPT_IMAGE to friendly message', () => {
    const msg = getFriendlyErrorMessage('CORRUPT_IMAGE');
    expect(msg).toMatch(/corrupted, truncated, or unreadable/i);
  });

  it('maps UNSUPPORTED_CAPTION_MODE to friendly message', () => {
    const msg = getFriendlyErrorMessage('UNSUPPORTED_CAPTION_MODE');
    expect(msg).toMatch(/caption mode is not supported/i);
  });

  it('maps other known backend error codes to friendly messages', () => {
    expect(getFriendlyErrorMessage('UNSUPPORTED_IMAGE_TYPE')).toMatch(/JPEG, PNG, and WebP/i);
    expect(getFriendlyErrorMessage('PAYLOAD_TOO_LARGE')).toMatch(/10MB/i);
    expect(getFriendlyErrorMessage('EMPTY_FILE')).toMatch(/empty/i);
    expect(getFriendlyErrorMessage('INFERENCE_TIMEOUT')).toMatch(/timed out/i);
    expect(getFriendlyErrorMessage('INFERENCE_SERVICE_UNAVAILABLE')).toMatch(/unavailable or busy/i);
  });

  it('falls back to provided message or default for unknown codes', () => {
    expect(getFriendlyErrorMessage('UNKNOWN_CODE', 'Custom fallback')).toBe('Custom fallback');
    expect(getFriendlyErrorMessage('UNKNOWN_CODE')).toMatch(/unexpected error occurred/i);
  });
});
